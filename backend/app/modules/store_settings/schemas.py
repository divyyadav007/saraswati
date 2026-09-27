"""
Schemas for Store Settings configuration.
Per docs/05-DATABASE-SCHEMA.md §2.26 and docs/11-ADMIN-PANEL.md §8.
"""
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class StoreSettingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    store_name: str
    store_phone: str
    store_email: str
    address_text: str
    cod_limit_amount: float
    cod_enabled: bool
    tax_enabled: bool
    tax_rate_percent: float
    delivery_charge_flat: float
    free_delivery_above: float | None = None
    serviceable_pincodes: list[str]
    max_qty_per_cart_item: int
    business_hours: dict[str, Any]
    updated_at: str


class StoreSettingUpdateRequest(BaseModel):
    store_name: str | None = Field(None, min_length=2, max_length=100)
    store_phone: str | None = Field(None, min_length=8, max_length=20)
    store_email: str | None = Field(None, min_length=5, max_length=100)
    address_text: str | None = Field(None, min_length=5, max_length=500)
    cod_limit_amount: float | None = Field(None, ge=0.0)
    cod_enabled: bool | None = None
    tax_enabled: bool | None = None
    tax_rate_percent: float | None = Field(None, ge=0.0, le=100.0)
    delivery_charge_flat: float | None = Field(None, ge=0.0)
    free_delivery_above: float | None = Field(None, ge=0.0)
    serviceable_pincodes: list[str] | None = None
    max_qty_per_cart_item: int | None = Field(None, ge=1, le=100)
    business_hours: dict[str, Any] | None = None
