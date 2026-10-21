"""
seed.py — runs seed_adhkar.sql once. Safe to re-run (skips duplicates).

Run with:
    python seed.py
"""

import os
import sys

import db  # db.py already calls load_dotenv()

# Confirm we're in the right folder
if not os.path.exists("seed_adhkar.sql"):
    print("ERROR: seed_adhkar.sql not found in this folder.")
    print(f"Current folder: {os.getcwd()}")
    print("Fix: run this script from the folder that contains seed_adhkar.sql")
    sys.exit(1)

# Confirm DB connection before touching data
print("Checking DB connection...")
try:
    db.fetch_one("SELECT 1 AS ok")
    print("DB OK.")
except Exception as e:
    print(f"ERROR: cannot connect to MySQL: {e}")
    sys.exit(1)

# Read SQL and split into statements
with open("seed_adhkar.sql", "r", encoding="utf-8") as f:
    sql = f.read()

statements = [s.strip() for s in sql.split(";") if s.strip() and not s.strip().startswith("--")]
print(f"Found {len(statements)} SQL statements.")

# Run each statement; report per-statement result
conn = db.get_connection()
cur = conn.cursor()
ok = 0
skipped = 0
for i, stmt in enumerate(statements, start=1):
    try:
        cur.execute(stmt)
        conn.commit()
        ok += 1
        print(f"  [{i}/{len(statements)}] OK (rows affected: {cur.rowcount})")
    except Exception as e:
        # Duplicate key = already seeded; not an error
        if "Duplicate entry" in str(e) or "1062" in str(e):
            skipped += 1
            print(f"  [{i}/{len(statements)}] SKIP (already exists)")
        else:
            conn.rollback()
            print(f"  [{i}/{len(statements)}] FAIL: {e}")
            cur.close()
            conn.close()
            sys.exit(1)

cur.close()
conn.close()
print()
print(f"Done. {ok} statements applied, {skipped} skipped.")