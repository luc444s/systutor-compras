from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class PurchaseReportSummaryRead(BaseModel):
    total_amount: float
    order_count: int
    line_count: int


class PurchaseReportProductRead(BaseModel):
    product_id: str
    sku: str | None
    name: str | None
    quantity: float
    amount: float


class PurchaseReportOrderRead(BaseModel):
    order_id: str
    created_at: datetime
    party_name: str | None
    status: str
    amount: float
    counts_towards_total: bool


class PurchaseOrdersReportRead(BaseModel):
    summary: PurchaseReportSummaryRead
    products: list[PurchaseReportProductRead]
    orders: list[PurchaseReportOrderRead]
