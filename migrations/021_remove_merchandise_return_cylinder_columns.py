from __future__ import annotations

from sqlalchemy import inspect, text

revision = "0021"


def upgrade(db) -> None:
    bind = db.connection()
    inspector = inspect(bind)

    if not inspector.has_table("com_merchandise_return_lines"):
        return

    columns = {column["name"] for column in inspector.get_columns("com_merchandise_return_lines")}
    bind.execute(text("DROP INDEX IF EXISTS ix_com_merchandise_return_lines_cylinder_id"))

    if "cylinder_id" in columns:
        bind.execute(text("ALTER TABLE com_merchandise_return_lines DROP COLUMN cylinder_id"))
    if "serial" in columns:
        bind.execute(text("ALTER TABLE com_merchandise_return_lines DROP COLUMN serial"))


# Forward-only cleanup: cylinder/serial return-line fields belonged to the
# removed industrial-gas domain and are no longer represented by backend models.
