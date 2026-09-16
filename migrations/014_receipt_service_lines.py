from __future__ import annotations

revision = "0014"


def upgrade(db) -> None:
    # Dominio de lineas de servicio por serial eliminado (A.SPEC 0012).
    # Migracion neutralizada: com_receipt_service_lines ya no forma parte del plugin.
    # Ver 020_remove_cylinder_domain_v1.py.
    return None


def downgrade(db) -> None:
    return None
