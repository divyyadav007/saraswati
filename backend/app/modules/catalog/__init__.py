"""Catalogue module package."""
from app.modules.catalog.admin_router import admin_catalog_router
from app.modules.catalog.router import router

__all__ = ["router", "admin_catalog_router"]
