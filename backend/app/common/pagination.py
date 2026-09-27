"""
Pagination helper.
Per docs/06-API-SPECIFICATION.md §2.
"""
from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1, description="Page number (1-indexed)")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page (max 100)")

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size

    @property
    def limit(self) -> int:
        return self.page_size


class PaginatedResponse(BaseModel, Generic[T]):
    """Standard paginated list response envelope per the API spec."""
    items: list[T]
    page: int
    page_size: int
    total_items: int
    total_pages: int

    @classmethod
    def from_items(
        cls,
        items: list[T],
        total_items: int,
        params: PaginationParams,
    ) -> "PaginatedResponse[T]":
        import math
        return cls(
            items=items,
            page=params.page,
            page_size=params.page_size,
            total_items=total_items,
            total_pages=max(1, math.ceil(total_items / params.page_size)),
        )
