from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy.orm import Session
from systutor.kernel.tenants.context import TenantContext

from plugins.commerce.purchase.backend.routers.common import DB_SESSION, REQUIRE_ORDER_READ, TENANT_CONTEXT
from plugins.commerce.purchase.backend.schemas.reports import PurchaseOrdersReportRead
from plugins.commerce.purchase.backend.services import reports

router = APIRouter()


@router.get("/orders", response_model=PurchaseOrdersReportRead, dependencies=[REQUIRE_ORDER_READ])
def get_purchase_orders_report_endpoint(
    report_from: datetime = Query(alias="from"),
    report_to: datetime = Query(alias="to"),
    db: Session = DB_SESSION,
    tenant_context: TenantContext = TENANT_CONTEXT,
) -> PurchaseOrdersReportRead:
    if report_to < report_from:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rango inválido")
    return PurchaseOrdersReportRead.model_validate(
        reports.get_purchase_orders_report(
            db,
            tenant_id=tenant_context.current_tenant_id,
            start=report_from,
            end=report_to,
        )
    )
