"""
seed_routines.py — runs seed_routines.sql once.
Safe to re-run: skips rows that already exist.
"""
import os, sys
import db

if not os.path.exists("seed_routines.sql"):
    print("ERROR: seed_routines.sql not found.")
    sys.exit(1)

print("Checking DB connection...")
try:
    db.fetch_one("SELECT 1 AS ok")
    print("DB OK.")
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)

with open("seed_routines.sql", "r", encoding="utf-8") as f:
    raw = f.read()


def strip_leading_comments(stmt):
    """Drop leading -- comment lines and blank lines; keep the SQL."""
    lines = stmt.split("\n")
    cleaned = []
    seen_sql = False
    for line in lines:
        stripped = line.strip()
        if not seen_sql and (not stripped or stripped.startswith("--")):
            continue
        seen_sql = True
        cleaned.append(line)
    return "\n".join(cleaned).strip()


statements = []
for raw_stmt in raw.split(";"):
    cleaned = strip_leading_comments(raw_stmt)
    if cleaned:
        statements.append(cleaned)

print(f"Found {len(statements)} SQL statements.")

conn = db.get_connection()
cur = conn.cursor()
ok = skipped = 0
for i, stmt in enumerate(statements, start=1):
    try:
        cur.execute(stmt)
        conn.commit()
        ok += 1
        print(f"  [{i}/{len(statements)}] OK (rows affected: {cur.rowcount})")
    except Exception as e:
        if "Duplicate entry" in str(e) or "1062" in str(e):
            skipped += 1
            print(f"  [{i}/{len(statements)}] SKIP (already exists)")
        else:
            conn.rollback()
            print(f"  [{i}/{len(statements)}] FAIL: {e}")
            cur.close(); conn.close(); sys.exit(1)

cur.close()
conn.close()
print(f"\nDone. {ok} applied, {skipped} skipped.")