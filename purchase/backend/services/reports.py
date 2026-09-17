from __future__ import annotations

from datetime import datetime

from sqlalchemy import text
from sqlalchemy.orm import Session


def get_purchase_orders_report(db: Session, *, tenant_id: str, start: datetime, end: datetime) -> dict:
    summary_row = db.execute(
        text(
            """
            SELECT
              COALESCE(SUM(i.quantity * i.unit_cost), 0) AS total_amount,
              COUNT(DISTINCT o.id) AS order_count,
              COUNT(i.id) AS line_count
            FROM com_purchase_orders o
            JOIN com_purchase_items i ON i.order_id = o.id
            WHERE o.tenant_id = :tenant_id
              AND o.created_at >= :start
              AND o.created_at <= :end
              AND o.status NOT IN ('DRAFT', 'CANCELLED')
            """
        ),
        {"tenant_id": tenant_id, "start": start, "end": end},
    ).one()
    product_rows = db.execute(
        text(
            """
            SELECT
              i.product_id,
              p.sku,
              p.name,
              COALESCE(SUM(i.quantity), 0) AS quantity,
              COALESCE(SUM(i.quantity * i.unit_cost), 0) AS amount
            FROM com_purchase_orders o
            JOIN com_purchase_items i ON i.order_id = o.id
            LEFT JOIN prod_products p ON p.id = i.product_id AND p.tenant_id = o.tenant_id
            WHERE o.tenant_id = :tenant_id
              AND o.created_at >= :start
              AND o.created_at <= :end
              AND o.status NOT IN ('DRAFT', 'CANCELLED')
            GROUP BY i.product_id, p.sku, p.name
            ORDER BY amount DESC, p.name ASC
            """
        ),
        {"tenant_id": tenant_id, "start": start, "end": end},
    ).all()
    order_rows = db.execute(
        text(
            """
            SELECT
              o.id AS order_id,
              o.created_at,
              s.name AS party_name,
              o.status,
              CASE
                WHEN o.status = 'CANCELLED' THEN 0
                ELSE COALESCE(SUM(i.quantity * i.unit_cost), 0)
              END AS amount,
              CASE WHEN o.status = 'CANCELLED' THEN false ELSE true END AS counts_towards_total
            FROM com_purchase_orders o
            JOIN com_purchase_items i ON i.order_id = o.id
            LEFT JOIN com_suppliers s ON s.id = o.supplier_id AND s.tenant_id = o.tenant_id
            WHERE o.tenant_id = :tenant_id
              AND o.created_at >= :start
              AND o.created_at <= :end
              AND o.status != 'DRAFT'
            GROUP BY o.id, o.created_at, s.name, o.status
            ORDER BY o.created_at DESC
            """
        ),
        {"tenant_id": tenant_id, "start": start, "end": end},
    ).all()
    return {
        "summary": {
            "total_amount": float(summary_row.total_amount),
            "order_count": int(summary_row.order_count),
            "line_count": int(summary_row.line_count),
        },
        "products": [
            {
                "product_id": row.product_id,
                "sku": row.sku,
                "name": row.name,
                "quantity": float(row.quantity),
                "amount": float(row.amount),
            }
            for row in product_rows
        ],
        "orders": [
            {
                "order_id": row.order_id,
                "created_at": row.created_at,
                "party_name": row.party_name,
                "status": row.status,
                "amount": float(row.amount),
                "counts_towards_total": bool(row.counts_towards_total),
            }
            for row in order_rows
        ],
    }
