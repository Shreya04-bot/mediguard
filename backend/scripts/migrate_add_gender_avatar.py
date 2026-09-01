"""
MediGuard AI — Migration: add `gender` and `avatar_key` to `users`
====================================================================
This project has no Alembic/Flyway migration runner (auth/db.py just
calls Base.metadata.create_all(), which only creates *missing* tables —
it never alters existing ones). For a brand-new database, create_all()
already produces the right schema because models/user.py now declares
these two columns.

This script is only needed to bring an *existing* database (created
before this change) up to date, without resetting or losing any data.
It is safe to run multiple times: each ALTER is skipped if the column
already exists.

Usage:
    cd backend
    python scripts/migrate_add_gender_avatar.py
"""

from __future__ import annotations
import os
import sqlite3
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from auth.db import DB_PATH  # noqa: E402


def _has_column(cursor: sqlite3.Cursor, table: str, column: str) -> bool:
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())


def main() -> None:
    if not os.path.exists(DB_PATH):
        print(f"No database found at {DB_PATH} — nothing to migrate "
              f"(a fresh database will already include gender/avatar_key).")
        return

    conn = sqlite3.connect(DB_PATH)
    try:
        cur = conn.cursor()
        added = []

        if not _has_column(cur, "users", "gender"):
            cur.execute("ALTER TABLE users ADD COLUMN gender VARCHAR(20)")
            added.append("gender")

        if not _has_column(cur, "users", "avatar_key"):
            cur.execute("ALTER TABLE users ADD COLUMN avatar_key VARCHAR(50)")
            added.append("avatar_key")

        conn.commit()

        if added:
            print(f"Added column(s) to users: {', '.join(added)}. "
                  f"Existing rows have NULL for these — the frontend/backend "
                  f"already treat NULL gender as 'neutral' and NULL avatar_key "
                  f"as 'no selection yet' (falls back to the gender default).")
        else:
            print("users.gender and users.avatar_key already exist — nothing to do.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
