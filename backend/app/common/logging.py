"""
Structured JSON logging for Saraswati backend.
Per docs/23-OBSERVABILITY.md §1 and docs/08-SECURITY.md §14.
"""
import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any


class JSONFormatter(logging.Formatter):
    """
    Formatter that outputs a single JSON object per log record.
    Includes timestamp, level, message, request_id, path, method, status_code, duration_ms, user_id, role.
    """

    def format(self, record: logging.LogRecord) -> str:
        log_obj: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Contextual request and user attributes if present
        for field in ("request_id", "path", "method", "status_code", "duration_ms", "user_id", "role"):
            if hasattr(record, field):
                log_obj[field] = getattr(record, field)

        # Exception information if present
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_obj)


def setup_logging(log_level: str = "INFO") -> None:
    """Configures root logger with JSONFormatter for production observability."""
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))

    # Remove existing handlers to avoid duplicates
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    root_logger.addHandler(handler)
