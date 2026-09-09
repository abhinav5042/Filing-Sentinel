"""
One-off migration: add email verification columns to the existing users
table, without losing any existing users/memos/watchlist data.
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "filingsentinel.db")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

existing_columns = [row[1] for row in cursor.execute("PRAGMA table_info(users)").fetchall()]

if "is_verified" not in existing_columns:
    cursor.execute("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT 0")
    print("Added is_verified column.")
else:
    print("is_verified column already exists.")

if "verification_token" not in existing_columns:
    cursor.execute("ALTER TABLE users ADD COLUMN verification_token TEXT")
    print("Added verification_token column.")
else:
    print("verification_token column already exists.")

conn.commit()
conn.close()
print("Migration complete.")
