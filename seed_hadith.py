"""Runs migrate_hadith.sql then seed_hadith.sql. Safe to re-run."""
import os, sys
import db

print("Checking DB connection...")
try:
    db.fetch_one("SELECT 1 AS ok")
    print("DB OK.")
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)


def strip_leading_comments(stmt):
    lines = stmt.split("\n")
    cleaned, seen_sql = [], False
    for line in lines:
        s = line.strip()
        if not seen_sql and (not s or s.startswith("--")):
            continue
        seen_sql = True
        cleaned.append(line)
    return "\n".join(cleaned).strip()


def run_sql_file(path):
    if not os.path.exists(path):
        print(f"ERROR: {path} not found.")
        sys.exit(1)
    with open(path, "r", encoding="utf-8") as f:
        raw = f.read()
    statements = [strip_leading_comments(s) for s in raw.split(";")]
    statements = [s for s in statements if s]
    print(f"\n--- {path}: {len(statements)} statement(s) ---")

    conn = db.get_connection()
    cur = conn.cursor()
    ok = skipped = 0
    for i, stmt in enumerate(statements, start=1):
        try:
            cur.execute(stmt)
            conn.commit()
            ok += 1
            print(f"  [{i}/{len(statements)}] OK (rows: {cur.rowcount})")
        except Exception as e:
            msg = str(e)
            if "Duplicate" in msg or "1062" in msg or "1060" in msg or "1050" in msg:
                skipped += 1
                print(f"  [{i}/{len(statements)}] SKIP (already applied)")
            else:
                conn.rollback()
                print(f"  [{i}/{len(statements)}] FAIL: {e}")
                cur.close(); conn.close(); sys.exit(1)
    cur.close(); conn.close()
    print(f"  Done: {ok} applied, {skipped} skipped.")


run_sql_file("migrate_hadith.sql")
run_sql_file("seed_hadith.sql")
print("\nAll done.")