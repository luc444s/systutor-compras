from __future__ import annotations

revision = "0003"


def upgrade(db) -> None:
    # Dominio de despacho por serial/custodia eliminado (A.SPEC 0012).
    # Migracion neutralizada: com_dispatches / com_dispatch_cylinders ya no
    # forman parte del plugin. Ver 020_remove_cylinder_domain_v1.py.
    return None


def downgrade(db) -> None:
    return None
