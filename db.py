"""
db.py — MySQL helpers for Zikrnoor.

load_dotenv() runs at import time so ANY script that does `import db`
gets the .env vars loaded automatically. This removes the class of bug
where `python app.py` works but `python some_other_script.py` fails
with "using password: NO".
"""

import os
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv

# Load .env once, at import. Safe to call multiple times.
load_dotenv()


def get_connection():
    return mysql.connector.connect(
        host=os.environ.get("DB_HOST", "127.0.0.1"),
        port=int(os.environ.get("DB_PORT", "3306")),
        user=os.environ.get("DB_USER", "root"),
        password=os.environ.get("DB_PASSWORD", ""),
        database=os.environ.get("DB_NAME", "zikrnoor"),
        charset="utf8mb4",
        autocommit=False,
    )


def fetch_all(sql, params=None):
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute(sql, params or ())
        return cur.fetchall()
    finally:
        if cur is not None:
            cur.close()
        if conn is not None and conn.is_connected():
            conn.close()


def fetch_one(sql, params=None):
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor(dictionary=True)
        cur.execute(sql, params or ())
        return cur.fetchone()
    finally:
        if cur is not None:
            cur.close()
        if conn is not None and conn.is_connected():
            conn.close()


def execute(sql, params=None):
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(sql, params or ())
        conn.commit()
        return cur.lastrowid if cur.lastrowid else cur.rowcount
    except Error:
        if conn is not None:
            conn.rollback()
        raise
    finally:
        if cur is not None:
            cur.close()
        if conn is not None and conn.is_connected():
            conn.close()