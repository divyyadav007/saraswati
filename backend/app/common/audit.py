"""
Audit logging service.
Records administrative and security-critical mutations into audit_logs table.
Per docs/08-SECURITY.md §9 and docs/05-DATABASE-SCHEMA.md §2.27.
"""
import logging
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.operations import AuditLog

logger = logging.getLogger(__name__)

# Keys that must NEVER be persisted in audit log payloads
SENSITIVE_KEYS = {
    "password",
    "token",
    "access_token",
    "refresh_token",
    "secret",
    "service_role_key",
    "razorpay_signature",
    "fcm_token",
    "authorization",
}


def sanitize_payload(payload: dict[str, Any] | None) -> dict[str, Any] | None:
    """Recursively scrub sensitive keys and tokens from audit payloads."""
    if not payload or not isinstance(payload, dict):
        return payload

    clean: dict[str, Any] = {}
    for k, v in payload.items():
        if any(sensitive in k.lower() for sensitive in SENSITIVE_KEYS):
            clean[k] = "[REDACTED]"
        elif isinstance(v, dict):
            clean[k] = sanitize_payload(v)
        elif isinstance(v, list):
            clean[k] = [
                sanitize_payload(item) if isinstance(item, dict) else item
                for item in v
            ]
        else:
            clean[k] = v
    return clean


async def log_audit_event(
    db: AsyncSession,
    action: str,
    entity_type: str,
    actor_user_id: uuid.UUID | None = None,
    entity_id: uuid.UUID | None = None,
    before_data: dict[str, Any] | None = None,
    after_data: dict[str, Any] | None = None,
) -> AuditLog:
    """
    Persist an audit log record for state modifications.
    Safely sanitizes any credentials or secrets prior to committing.
    """
    try:
        audit_entry = AuditLog(
            actor_user_id=actor_user_id,
            action=action.upper(),
            entity_type=entity_type.upper(),
            entity_id=entity_id,
            before_data=sanitize_payload(before_data),
            after_data=sanitize_payload(after_data),
        )
        db.add(audit_entry)
        await db.flush()
        return audit_entry
    except Exception as exc:
        # Audit logging failure must be logged but not silently crash caller if outside main TX
        logger.error(
            "Failed to record audit log event: action=%s entity=%s error=%s",
            action,
            entity_type,
            str(exc),
        )
        raise exc
