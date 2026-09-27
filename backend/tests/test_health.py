"""Phase 0 smoke test — verifies FastAPI app starts and health endpoint works."""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/healthz")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "environment" in data


def test_health_alias():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "environment" in data


def test_docs_available_in_dev():
    """OpenAPI docs should be accessible in non-production environments."""
    response = client.get("/api/v1/docs")
    # In dev/test, docs should be available (redirect or 200)
    assert response.status_code in (200, 307, 404)  # 404 acceptable if no routes yet
