from __future__ import annotations

from sqlalchemy import inspect, text

revision = "0020"

_DROPPED_TABLES = (
    "com_dispatch_cylinders",
    "com_dispatches",
    "com_receipt_service_lines",
    "com_physical_count_expected_serials",
    "com_physical_count_items",
    "com_physical_count_events",
    "com_physical_counts",
)


def upgrade(db) -> None:
    bind = db.connection()
    inspector = inspect(bind)

    for table in _DROPPED_TABLES:
        if inspector.has_table(table):
            bind.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))

    if inspector.has_table("com_purchase_receipts"):
        columns = {column["name"] for column in inspector.get_columns("com_purchase_receipts")}
        if "dispatch_id" in columns:
            bind.execute(
                text("DROP INDEX IF EXISTS ix_com_purchase_receipts_dispatch_id")
            )
            bind.execute(
                text("ALTER TABLE com_purchase_receipts DROP COLUMN dispatch_id")
            )


# downgrade intencionalmente ausente: la recreacion del esquema de despacho por
# serial se revierte restaurando el commit de A.SPEC 0012, no con downgrade.
