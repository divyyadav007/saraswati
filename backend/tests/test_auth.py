"""
Phase 2A Test Suite — Authentication, Authorization (RBAC), and Foundation.
Per docs/04-ARCHITECTURE.md, docs/08-SECURITY.md, and docs/22-ERROR-HANDLING.md.
"""
import uuid

from fastapi.testclient import TestClient

from app.db.models.auth import Profile
from tests.conftest import InMemoryAuthDb


def test_health_endpoints(client: TestClient):
    """Health endpoints /healthz and /health return 200 with environment and correlation ID."""
    for path in ("/healthz", "/health"):
        res = client.get(path)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert "environment" in data
        assert "database" in data
        assert "X-Request-Id" in res.headers


def test_missing_authorization_header(client: TestClient):
    """Accessing protected endpoint without Authorization header returns 401 UNAUTHENTICATED."""
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401
    body = res.json()
    assert "error" in body
    assert body["error"]["code"] == "UNAUTHENTICATED"
    assert "Missing Authorization header" in body["error"]["message"]


def test_malformed_authorization_header(client: TestClient):
    """Authorization header with wrong scheme or missing token returns 401 UNAUTHENTICATED."""
    # Not Bearer
    res = client.get("/api/v1/auth/me", headers={"Authorization": "Basic dXNlcjpwYXNz"})
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "UNAUTHENTICATED"

    # Bearer with empty token
    res = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer   "})
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "UNAUTHENTICATED"


def test_invalid_signature_token(client: TestClient, make_token):
    """Token signed with wrong secret key returns 401 UNAUTHENTICATED."""
    token = make_token(secret="tampered-wrong-secret-key-1234567890")
    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401
    body = res.json()
    assert body["error"]["code"] == "UNAUTHENTICATED"
    assert "Invalid authentication token" in body["error"]["message"]


def test_expired_token(client: TestClient, make_token):
    """Expired token returns 401 UNAUTHENTICATED."""
    token = make_token(expires_in=-3600)  # Expired 1 hour ago
    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401
    body = res.json()
    assert body["error"]["code"] == "UNAUTHENTICATED"
    assert "expired" in body["error"]["message"].lower()


def test_customer_access_permitted(client: TestClient, mock_db: InMemoryAuthDb, make_token):
    """CUSTOMER role is allowed access to customer-level protected endpoints."""
    user_id = uuid.uuid4()
    mock_db.add_profile(Profile(
        id=user_id,
        role="CUSTOMER",
        full_name="Radha Sharma",
        phone="+919876543210",
        is_active=True,
    ))
    token = make_token(user_id=user_id)
    res = client.get(
        "/api/v1/auth/verify-role/customer",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["role"] == "CUSTOMER"
    assert data["user_id"] == str(user_id)


def test_customer_forbidden_from_admin_and_staff(client: TestClient, mock_db: InMemoryAuthDb, make_token):
    """CUSTOMER role attempting to access staff or admin routes is blocked with 403 FORBIDDEN."""
    user_id = uuid.uuid4()
    mock_db.add_profile(Profile(
        id=user_id,
        role="CUSTOMER",
        full_name="Radha Sharma",
        is_active=True,
    ))
    token = make_token(user_id=user_id)

    # Attempt staff route
    res_staff = client.get(
        "/api/v1/auth/verify-role/staff",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_staff.status_code == 403
    assert res_staff.json()["error"]["code"] == "FORBIDDEN"

    # Attempt admin route
    res_admin = client.get(
        "/api/v1/auth/verify-role/admin",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_admin.status_code == 403
    assert res_admin.json()["error"]["code"] == "FORBIDDEN"


def test_staff_role_permissions(client: TestClient, mock_db: InMemoryAuthDb, make_token):
    """STAFF role can access staff and customer routes, but is blocked from admin-only routes."""
    user_id = uuid.uuid4()
    mock_db.add_profile(Profile(
        id=user_id,
        role="STAFF",
        full_name="Shop Staff Member",
        is_active=True,
    ))
    token = make_token(user_id=user_id)

    # Allowed: staff route
    res_staff = client.get(
        "/api/v1/auth/verify-role/staff",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_staff.status_code == 200
    assert res_staff.json()["data"]["role"] == "STAFF"

    # Allowed: customer route (staff can view customer content)
    res_cust = client.get(
        "/api/v1/auth/verify-role/customer",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_cust.status_code == 200

    # Forbidden: admin route
    res_admin = client.get(
        "/api/v1/auth/verify-role/admin",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_admin.status_code == 403
    assert res_admin.json()["error"]["code"] == "FORBIDDEN"


def test_admin_role_permissions(client: TestClient, mock_db: InMemoryAuthDb, make_token):
    """ADMIN role has access to all protected verification routes."""
    user_id = uuid.uuid4()
    mock_db.add_profile(Profile(
        id=user_id,
        role="ADMIN",
        full_name="Store Owner Admin",
        is_active=True,
    ))
    token = make_token(user_id=user_id)

    # Admin route
    assert client.get("/api/v1/auth/verify-role/admin", headers={"Authorization": f"Bearer {token}"}).status_code == 200

    # Staff route
    assert client.get("/api/v1/auth/verify-role/staff", headers={"Authorization": f"Bearer {token}"}).status_code == 200

    # Customer route
    assert client.get("/api/v1/auth/verify-role/customer", headers={"Authorization": f"Bearer {token}"}).status_code == 200


def test_delivery_role_permissions(client: TestClient, mock_db: InMemoryAuthDb, make_token):
    """DELIVERY role can access delivery routes; regular CUSTOMER is blocked."""
    delivery_id = uuid.uuid4()
    mock_db.add_profile(Profile(
        id=delivery_id,
        role="DELIVERY",
        full_name="Delivery Partner",
        is_active=True,
    ))
    delivery_token = make_token(user_id=delivery_id)

    res_delivery = client.get(
        "/api/v1/auth/verify-role/delivery",
        headers={"Authorization": f"Bearer {delivery_token}"},
    )
    assert res_delivery.status_code == 200
    assert res_delivery.json()["data"]["role"] == "DELIVERY"

    # CUSTOMER attempting delivery route
    customer_id = uuid.uuid4()
    mock_db.add_profile(Profile(id=customer_id, role="CUSTOMER", is_active=True))
    customer_token = make_token(user_id=customer_id)

    res_forbidden = client.get(
        "/api/v1/auth/verify-role/delivery",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert res_forbidden.status_code == 403
    assert res_forbidden.json()["error"]["code"] == "FORBIDDEN"


def test_inactive_account_blocked(client: TestClient, mock_db: InMemoryAuthDb, make_token):
    """Deactivated account (is_active=False) is rejected with 403 FORBIDDEN."""
    user_id = uuid.uuid4()
    mock_db.add_profile(Profile(
        id=user_id,
        role="CUSTOMER",
        full_name="Deactivated User",
        is_active=False,
    ))
    token = make_token(user_id=user_id)

    res = client.get(
        "/api/v1/auth/verify-role/customer",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403
    body = res.json()
    assert body["error"]["code"] == "FORBIDDEN"
    assert "deactivated" in body["error"]["message"].lower()


def test_client_role_tampering_prevented(client: TestClient, mock_db: InMemoryAuthDb, make_token):
    """
    Security check: Even if a client crafts a JWT with claims claiming role="ADMIN",
    the backend ALWAYS resolves the authoritative role from the database profiles table.
    """
    user_id = uuid.uuid4()
    mock_db.add_profile(Profile(
        id=user_id,
        role="CUSTOMER",
        full_name="Sneaky Customer",
        is_active=True,
    ))
    # JWT claims role="ADMIN", but DB says CUSTOMER
    tampered_token = make_token(user_id=user_id, role="ADMIN")

    res = client.get(
        "/api/v1/auth/verify-role/admin",
        headers={"Authorization": f"Bearer {tampered_token}"},
    )
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "FORBIDDEN"


def test_sync_profile_and_me_flow(client: TestClient, mock_db: InMemoryAuthDb, make_token):
    """Full lifecycle: authenticated user syncs profile, then reads back profile via /me."""
    user_id = uuid.uuid4()
    token = make_token(
        user_id=user_id,
        phone="+919876543210",
        email="sita@example.com",
    )

    # 1. Sync profile
    sync_payload = {
        "full_name": "Sita Devi",
        "phone": "+919876543210",
        "email": "sita@example.com",
        "notif_promotional_opt_in": True,
    }
    sync_res = client.post(
        "/api/v1/auth/sync-profile",
        json=sync_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert sync_res.status_code == 200
    sync_data = sync_res.json()["data"]
    assert sync_data["id"] == str(user_id)
    assert sync_data["full_name"] == "Sita Devi"
    assert sync_data["role"] == "CUSTOMER"

    # 2. Get profile via /me
    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    me_data = me_res.json()["data"]
    assert me_data["id"] == str(user_id)
    assert me_data["full_name"] == "Sita Devi"
    assert me_data["role"] == "CUSTOMER"
    assert me_data["is_active"] is True


def test_validation_error_envelope(client: TestClient, make_token):
    """Pydantic validation failure returns standard 422 envelope with code VALIDATION_ERROR."""
    token = make_token()
    # Invalid phone format violating regex
    invalid_payload = {
        "full_name": "Test User",
        "phone": "not-a-valid-phone-number",
    }
    res = client.post(
        "/api/v1/auth/sync-profile",
        json=invalid_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 422
    body = res.json()
    assert "error" in body
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert "details" in body["error"]
    assert len(body["error"]["details"]) > 0


def test_request_id_correlation(client: TestClient):
    """Passed X-Request-Id header is echoed back on response."""
    custom_trace_id = "trace-test-12345678"
    res = client.get("/healthz", headers={"X-Request-Id": custom_trace_id})
    assert res.status_code == 200
    assert res.headers.get("X-Request-Id") == custom_trace_id
