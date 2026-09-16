from __future__ import annotations

revision = "0017"


def upgrade(db) -> None:
    # Dominio de conteos fisicos de envases eliminado (A.SPEC 0012).
    # Migracion neutralizada: com_physical_count* ya no forma parte del plugin.
    # Ver 020_remove_cylinder_domain_v1.py.
    return None


def downgrade(db) -> None:
    return None
