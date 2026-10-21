"""
check_env.py — figures out exactly what's wrong with .env / Flask / MySQL.

Run:  python check_env.py
Delete this file once Flask is working.
"""

import os
import sys
from pathlib import Path

print("=" * 60)
print("1. Checking python-dotenv is installed")
print("=" * 60)
try:
    from dotenv import load_dotenv
    print("OK — python-dotenv is installed")
except ImportError:
    print("FAIL — python-dotenv NOT installed")
    print("Fix: pip install python-dotenv")
    sys.exit(1)

print()
print("=" * 60)
print("2. Checking .env file exists")
print("=" * 60)
cwd = Path.cwd()
env_path = cwd / ".env"
print(f"Current folder: {cwd}")
print(f".env path:      {env_path}")
if env_path.exists():
    print(f"OK — .env exists, {env_path.stat().st_size} bytes")
else:
    print("FAIL — .env does NOT exist in this folder")
    print("Fix: copy .env.example → .env, then open .env and fill DB_PASSWORD")
    sys.exit(1)

print()
print("=" * 60)
print("3. Loading .env via python-dotenv")
print("=" * 60)
found = load_dotenv()
print(f"load_dotenv() returned: {found}  (True = file was found and parsed)")

print()
print("=" * 60)
print("4. Reading environment variables")
print("=" * 60)
for key in ("DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME", "SECRET_KEY"):
    val = os.environ.get(key)
    if val is None:
        print(f"{key:12} = (NOT SET)")
    elif key == "DB_PASSWORD":
        # Mask password but reveal length and first/last char
        if val == "your_mysql_password_here":
            print(f"{key:12} = (still the placeholder — fix .env)")
        elif len(val) == 0:
            print(f"{key:12} = (EMPTY — fix .env)")
        else:
            print(f"{key:12} = {'*' * (len(val) - 2)}{val[-2:]}   (len {len(val)})")
    else:
        print(f"{key:12} = {val}")

print()
print("=" * 60)
print("5. Trying to connect to MySQL via db.py")
print("=" * 60)
try:
    import db
    row = db.fetch_one("SELECT 1 AS ok")
    if row and row.get("ok") == 1:
        print("OK — MySQL connection works")
    else:
        print(f"FAIL — unexpected response: {row}")
        sys.exit(1)
except ImportError as e:
    print(f"FAIL — db.py not importable: {e}")
    print("Fix: make sure db.py exists in this folder")
    sys.exit(1)
except Exception as e:
    print(f"FAIL — MySQL connection failed:")
    print(f"       {type(e).__name__}: {e}")
    print()
    print("Common causes:")
    print("  - DB_PASSWORD in .env does not match your real MySQL password")
    print("  - MySQL service is not running (start MySQL80)")
    print("  - DB_NAME in .env is not 'zikrnoor'")
    sys.exit(1)

print()
print("=" * 60)
print("ALL CHECKS PASSED — app.py should work now")
print("=" * 60)