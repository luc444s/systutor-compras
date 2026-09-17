from __future__ import annotations

from sqlalchemy import text

revision = "0022"


def upgrade(db) -> None:
    bind = db.connection()

    # Add correlative columns to com_purchase_orders
    bind.execute(text("ALTER TABLE com_purchase_orders ADD COLUMN IF NOT EXISTS correlative_series_id VARCHAR(36) REFERENCES cfg_document_series(id)"))
    bind.execute(text("ALTER TABLE com_purchase_orders ADD COLUMN IF NOT EXISTS correlative_series VARCHAR(4)"))
    bind.execute(text("ALTER TABLE com_purchase_orders ADD COLUMN IF NOT EXISTS correlative_number INTEGER"))
    bind.execute(text("ALTER TABLE com_purchase_orders ADD COLUMN IF NOT EXISTS correlative_full_number VARCHAR(20)"))

    # Relax constraints on cfg_document_series to allow ORDEN_COMPRA document type
    bind.execute(text("ALTER TABLE cfg_document_series DROP CONSTRAINT IF EXISTS ck_cfg_document_series_type"))
    bind.execute(text("ALTER TABLE cfg_document_series ADD CONSTRAINT ck_cfg_document_series_type CHECK (document_type IN ('FACTURA', 'BOLETA', 'ORDEN_COMPRA'))"))
    bind.execute(text("ALTER TABLE cfg_document_series DROP CONSTRAINT IF EXISTS ck_cfg_document_series_format"))
    bind.execute(text("ALTER TABLE cfg_document_series ADD CONSTRAINT ck_cfg_document_series_format CHECK ((document_type = 'FACTURA' AND series ~ '^F[0-9]{3}$') OR (document_type = 'BOLETA' AND series ~ '^B[0-9]{3}$') OR (document_type = 'ORDEN_COMPRA' AND series ~ '^OC$'))"))

    # Seed default ORDEN_COMPRA series for all existing tenants
    tenant_rows = bind.execute(text("SELECT id FROM tenants LIMIT 1")).fetchall()
    user_rows = bind.execute(text("SELECT id FROM users LIMIT 1")).fetchall()
    if not tenant_rows or not user_rows:
        return

    tenant_id = tenant_rows[0][0]
    user_id = user_rows[0][0]

    existing = bind.execute(
        text(
            "SELECT id FROM cfg_document_series WHERE tenant_id = :tid AND document_type = 'ORDEN_COMPRA' AND series = 'OC' LIMIT 1"
        ),
        {"tid": tenant_id},
    ).fetchone()

    if not existing:
        bind.execute(
            text(
                """
                INSERT INTO cfg_document_series
                  (id, tenant_id, branch_id, document_type, series, initial_number, next_number,
                   is_default, is_active, created_by, created_at, updated_at)
                VALUES
                  (:id, :tenant_id, NULL, 'ORDEN_COMPRA', 'OC', 1, 2,
                   TRUE, TRUE, :user_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """
            ),
            {"id": "00000000-0000-0000-0000-000000000001", "tenant_id": tenant_id, "user_id": user_id},
        )


def downgrade(db) -> None:
    bind = db.connection()
    bind.execute(text("DELETE FROM cfg_document_series WHERE document_type = 'ORDEN_COMPRA'"))

    # Restore original constraints
    bind.execute(text("ALTER TABLE cfg_document_series DROP CONSTRAINT IF EXISTS ck_cfg_document_series_type"))
    bind.execute(text("ALTER TABLE cfg_document_series ADD CONSTRAINT ck_cfg_document_series_type CHECK (document_type IN ('FACTURA', 'BOLETA'))"))
    bind.execute(text("ALTER TABLE cfg_document_series DROP CONSTRAINT IF EXISTS ck_cfg_document_series_format"))
    bind.execute(text("ALTER TABLE cfg_document_series ADD CONSTRAINT ck_cfg_document_series_format CHECK ((document_type = 'FACTURA' AND series ~ '^F[0-9]{3}$') OR (document_type = 'BOLETA' AND series ~ '^B[0-9]{3}$'))"))

    bind.execute(text("ALTER TABLE com_purchase_orders DROP COLUMN IF EXISTS correlative_full_number"))
    bind.execute(text("ALTER TABLE com_purchase_orders DROP COLUMN IF EXISTS correlative_number"))
    bind.execute(text("ALTER TABLE com_purchase_orders DROP COLUMN IF EXISTS correlative_series"))
    bind.execute(text("ALTER TABLE com_purchase_orders DROP COLUMN IF EXISTS correlative_series_id"))
