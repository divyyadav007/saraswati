"""
Backend test configuration and shared test fixtures.
Per docs/15-TESTING-STRATEGY.md
"""
import time
import uuid
from collections.abc import AsyncGenerator

import jwt
import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.db.models.auth import Profile
from app.db.session import get_db
from app.main import app

TEST_JWT_SECRET = "test-supabase-jwt-secret-key-32-chars-long!"


class MockResult:
    """Mock for SQLAlchemy Result."""

    def __init__(self, item):
        self._item = item

    def scalar_one_or_none(self):
        return self._item

    def scalar_one(self):
        if self._item is None:
            raise ValueError("No item found")
        return self._item

    def scalar(self):
        return self._item

    def scalars(self):
        class ScalarIterable:
            def __init__(self, items):
                self._items = items
            def all(self):
                return self._items
            def first(self):
                return self._items[0] if self._items else None
        return ScalarIterable([self._item] if self._item is not None else [])


class InMemoryAuthDb:
    """In-memory mock database session for fast, isolated auth tests."""

    def __init__(self):
        self.profiles: dict[uuid.UUID, Profile] = {}

    def add_profile(self, profile: Profile):
        self.profiles[profile.id] = profile

    async def execute(self, stmt, *args, **kwargs):
        # Handle ping queries
        if "SELECT 1" in str(stmt):
            return MockResult(1)

        # Handle Profile queries
        compiled = getattr(stmt, "compile", lambda: None)()
        params = compiled.params if compiled else {}

        for val in params.values():
            if isinstance(val, uuid.UUID) and val in self.profiles:
                return MockResult(self.profiles[val])
            try:
                u = uuid.UUID(str(val))
                if u in self.profiles:
                    return MockResult(self.profiles[u])
            except (ValueError, TypeError):
                pass
            for p in self.profiles.values():
                if p.phone == val or p.email == val:
                    return MockResult(p)

        return MockResult(None)

    def add(self, instance):
        if isinstance(instance, Profile):
            self.profiles[instance.id] = instance

    async def commit(self):
        pass

    async def refresh(self, instance):
        pass

    async def close(self):
        pass


@pytest.fixture(autouse=True)
def configure_test_environment(monkeypatch):
    """Ensure test JWT secret and environment are active for tests."""
    settings = get_settings()
    monkeypatch.setattr(settings, "supabase_jwt_secret", TEST_JWT_SECRET)
    monkeypatch.setattr(settings, "environment", "development")


@pytest.fixture
def mock_db() -> InMemoryAuthDb:
    """Fixture providing isolated in-memory DB session."""
    return InMemoryAuthDb()


@pytest.fixture
def client(mock_db: InMemoryAuthDb) -> TestClient:
    """TestClient with get_db overridden to use in-memory mock."""
    async def override_get_db() -> AsyncGenerator[InMemoryAuthDb, None]:
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def make_token():
    """Helper factory to mint signed test JWTs."""
    def _generator(
        user_id: uuid.UUID | None = None,
        role: str = "authenticated",
        expires_in: int = 3600,
        email: str | None = None,
        phone: str | None = None,
        full_name: str | None = None,
        secret: str = TEST_JWT_SECRET,
        algorithm: str = "HS256",
    ) -> str:
        uid = user_id or uuid.uuid4()
        now = time.time()
        payload = {
            "sub": str(uid),
            "role": role,
            "iat": int(now),
            "exp": int(now + expires_in),
            "aud": "authenticated",
        }
        if email:
            payload["email"] = email
        if phone:
            payload["phone"] = phone
        if full_name:
            payload["user_metadata"] = {"full_name": full_name}

        return jwt.encode(payload, secret, algorithm=algorithm)

    return _generator
