from fastapi import APIRouter

from plugins.commerce.purchase.backend.routers import (
    claims,
    invoices,
    orders,
    returns,
    suppliers,
)

router = APIRouter(prefix="/purchase", tags=["compras"])

router.include_router(suppliers.router, prefix="/suppliers")
router.include_router(orders.router, prefix="/orders")
router.include_router(returns.router)
router.include_router(invoices.router)
router.include_router(claims.router)
