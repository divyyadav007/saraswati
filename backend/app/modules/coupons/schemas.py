"""
Coupons Pydantic Schemas.
Per docs/06-API-SPECIFICATION.md §6.6, §6.18 and docs/03-FEATURE-SPECIFICATION.md §4.1
"""
import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class CouponCreateRequest(BaseModel):
    code: str = Field(..., min_length=2, max_length=50)
    type: str = Field(..., pattern=r"^(PERCENTAGE|FLAT)$")
    value: float = Field(..., gt=0)
    min_order_value: float = Field(default=0.0, ge=0)
    max_discount_amount: float | None = Field(default=None, gt=0)
    usage_limit_total: int | None = Field(default=None, gt=0)
    usage_limit_per_user: int = Field(default=1, ge=1)
    valid_from: datetime
    valid_until: datetime
    is_active: bool = True

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v: str) -> str:
        return v.strip().upper()


class CouponUpdateRequest(BaseModel):
    code: str | None = Field(None, min_length=2, max_length=50)
    type: str | None = Field(None, pattern=r"^(PERCENTAGE|FLAT)$")
    value: float | None = Field(None, gt=0)
    min_order_value: float | None = Field(None, ge=0)
    max_discount_amount: float | None = Field(None, gt=0)
    usage_limit_total: int | None = Field(None, gt=0)
    usage_limit_per_user: int | None = Field(None, ge=1)
    valid_from: datetime | None = None
    valid_until: datetime | None = None
    is_active: bool | None = None

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v: str | None) -> str | None:
        return v.strip().upper() if v else None


class CouponResponse(BaseModel):
    id: uuid.UUID
    code: str
    type: str
    value: float
    min_order_value: float
    max_discount_amount: float | None = None
    usage_limit_total: int | None = None
    usage_limit_per_user: int
    valid_from: datetime
    valid_until: datetime
    is_active: bool
    total_usages: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CouponValidateRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    cart_total: float = Field(default=0.0, ge=0)

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v: str) -> str:
        return v.strip().upper()


class CouponValidateResponse(BaseModel):
    is_valid: bool
    code: str
    discount_amount: float = 0.0
    message: str
    coupon_id: uuid.UUID | None = None
