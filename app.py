"""
app.py — Zikrnoor Flask backend.
"""

import os
import logging
from datetime import date, datetime

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from mysql.connector import Error

import db

load_dotenv()

app = Flask(__name__, template_folder=None, static_folder=None)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-only-change-me")

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("zikrnoor")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def _db_unavailable(exc):
    log.exception("Database error: %s", exc)
    return jsonify(status="error", error="database_unavailable",
                   detail="Could not reach the database. Please try again."), 503


@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/style.css")
def style_css():
    return send_from_directory(BASE_DIR, "style.css")


@app.route("/script.js")
def script_js():
    return send_from_directory(BASE_DIR, "script.js")


@app.route("/api/health")
def health():
    try:
        row = db.fetch_one("SELECT 1 AS ok")
        if row and row.get("ok") == 1:
            return jsonify(status="ok", database="connected"), 200
        return jsonify(status="error", database="unexpected_response"), 503
    except Error as exc:
        log.exception("Health check DB failure")
        return jsonify(status="error", database="unreachable", detail=str(exc)), 503


# ===== QURAN =====

@app.get("/api/surahs")
def list_surahs():
    try:
        rows = db.fetch_all(
            "SELECT surah_id, name_arabic, name_english, verse_count "
            "FROM surahs ORDER BY surah_id ASC"
        )
    except Error as exc:
        return _db_unavailable(exc)
    if not rows:
        return jsonify(surahs=[], count=0,
                       message="No Surahs have been imported into the database yet."), 200
    return jsonify(surahs=rows, count=len(rows)), 200


@app.get("/api/surahs/<int:surah_id>/verses")
def surah_verses(surah_id):
    try:
        surah = db.fetch_one(
            "SELECT surah_id, name_arabic, name_english, verse_count "
            "FROM surahs WHERE surah_id = %s", (surah_id,))
    except Error as exc:
        return _db_unavailable(exc)
    if not surah:
        return jsonify(status="error", error="not_found",
                       detail=f"Surah {surah_id} does not exist."), 404
    try:
        verse_rows = db.fetch_all(
            "SELECT verse_id, verse_number, arabic_text FROM verses "
            "WHERE surah_id = %s ORDER BY verse_number ASC", (surah_id,))
    except Error as exc:
        return _db_unavailable(exc)
    if not verse_rows:
        return jsonify(surah=surah, verses=[], count=0,
                       message="This Surah exists, but its verses have not been imported yet."), 200
    verse_ids = [v["verse_id"] for v in verse_rows]
    placeholders = ",".join(["%s"] * len(verse_ids))
    try:
        translation_rows = db.fetch_all(
            f"SELECT vt.verse_id, vt.translation_id, vt.translated_text, "
            f"t.translator_name, t.language, t.edition "
            f"FROM verse_translations vt "
            f"JOIN translations t ON t.translation_id = vt.translation_id "
            f"WHERE vt.verse_id IN ({placeholders}) "
            f"ORDER BY vt.verse_id ASC, vt.translation_id ASC", tuple(verse_ids))
    except Error as exc:
        return _db_unavailable(exc)
    by_verse = {}
    for tr in translation_rows:
        by_verse.setdefault(tr["verse_id"], []).append({
            "translation_id": tr["translation_id"],
            "translator_name": tr["translator_name"],
            "language": tr["language"],
            "edition": tr["edition"],
            "text": tr["translated_text"],
        })
    verses = [{"verse_id": v["verse_id"], "verse_number": v["verse_number"],
               "arabic_text": v["arabic_text"],
               "translations": by_verse.get(v["verse_id"], [])} for v in verse_rows]
    return jsonify(surah=surah, verses=verses, count=len(verses)), 200


# ===== ADHKAR =====

@app.get("/api/adhkar")
def list_adhkar():
    category = (request.args.get("category") or "").strip().lower()
    search = (request.args.get("search") or "").strip().lower()
    sql = ("SELECT a.adhkar_id, a.title, a.arabic_text, a.translation, "
           "a.transliteration, a.recommended_count, a.verification_notes, "
           "s.source_id, s.source_name, s.reference_details, s.source_url, s.authenticity_grade "
           "FROM adhkar a LEFT JOIN sources s ON s.source_id = a.source_id")
    params = []
    if search:
        sql += (" WHERE (LOWER(a.title) LIKE %s OR LOWER(a.translation) LIKE %s "
                "OR LOWER(a.transliteration) LIKE %s)")
        like = f"%{search}%"
        params.extend([like, like, like])
    sql += " ORDER BY a.adhkar_id ASC"
    try:
        rows = db.fetch_all(sql, tuple(params) if params else None)
    except Error as exc:
        return _db_unavailable(exc)
    if not rows:
        return jsonify(adhkar=[], count=0,
                       message="No Adhkar have been imported into the database yet."), 200
    adhkar_ids = [r["adhkar_id"] for r in rows]
    placeholders = ",".join(["%s"] * len(adhkar_ids))
    try:
        cat_rows = db.fetch_all(
            f"SELECT ac.adhkar_id, c.category_id, c.category_name "
            f"FROM adhkar_categories ac JOIN categories c ON c.category_id = ac.category_id "
            f"WHERE ac.adhkar_id IN ({placeholders})", tuple(adhkar_ids))
    except Error as exc:
        return _db_unavailable(exc)
    cats_by_adhkar = {}
    for c in cat_rows:
        cats_by_adhkar.setdefault(c["adhkar_id"], []).append({
            "category_id": c["category_id"], "category_name": c["category_name"]})
    adhkar_list = []
    for r in rows:
        cats = cats_by_adhkar.get(r["adhkar_id"], [])
        if category and category not in [c["category_name"].lower() for c in cats]:
            continue
        adhkar_list.append({
            "adhkar_id": r["adhkar_id"], "title": r["title"],
            "arabic_text": r["arabic_text"], "translation": r["translation"],
            "transliteration": r["transliteration"],
            "recommended_count": r["recommended_count"],
            "verification_notes": r["verification_notes"],
            "categories": cats,
            "source": {"source_id": r["source_id"], "source_name": r["source_name"],
                       "reference_details": r["reference_details"],
                       "source_url": r["source_url"],
                       "authenticity_grade": r["authenticity_grade"]}
                      if r["source_id"] is not None else None,
        })
    return jsonify(adhkar=adhkar_list, count=len(adhkar_list)), 200


@app.post("/api/adhkar/progress")
def save_adhkar_progress():
    data = request.get_json(silent=True) or {}
    adhkar_id = data.get("adhkar_id")
    count = data.get("completed_count", 0)
    if not isinstance(adhkar_id, int) or adhkar_id < 1:
        return jsonify(error="invalid_adhkar_id"), 400
    if not isinstance(count, int) or count < 0:
        return jsonify(error="invalid_completed_count"), 400
    today = date.today().isoformat()
    try:
        exists = db.fetch_one("SELECT adhkar_id FROM adhkar WHERE adhkar_id = %s",
                              (adhkar_id,))
        if not exists:
            return jsonify(error="adhkar_not_found",
                           detail=f"adhkar_id {adhkar_id} does not exist in the database."), 404
        db.execute(
            "INSERT INTO user_adhkar_progress "
            "(adhkar_id, progress_date, completed_count, is_completed) "
            "VALUES (%s, %s, %s, %s) ON DUPLICATE KEY UPDATE "
            "completed_count = VALUES(completed_count), "
            "is_completed = VALUES(is_completed)",
            (adhkar_id, today, count, 1 if count > 0 else 0))
        return jsonify(status="ok", saved=True, adhkar_id=adhkar_id,
                       progress_date=today, completed_count=count), 200
    except Error as exc:
        return _db_unavailable(exc)


@app.get("/api/adhkar/progress/today")
def adhkar_progress_today():
    try:
        rows = db.fetch_all(
            "SELECT a.adhkar_id, a.title, a.recommended_count, "
            "COALESCE(p.completed_count, 0) AS completed_count, "
            "COALESCE(p.is_completed, 0) AS is_completed "
            "FROM adhkar a LEFT JOIN user_adhkar_progress p "
            "ON p.adhkar_id = a.adhkar_id AND p.progress_date = CURDATE() "
            "ORDER BY a.adhkar_id ASC")
    except Error as exc:
        return _db_unavailable(exc)
    if not rows:
        return jsonify(date=date.today().isoformat(), adhkar=[], completed=0, total=0,
                       message="No Adhkar have been imported into the database yet."), 200
    completed = sum(1 for r in rows if r["is_completed"])
    return jsonify(date=date.today().isoformat(), adhkar=rows,
                   completed=completed, total=len(rows)), 200


# ===== TASBEEH =====

@app.post("/api/tasbeeh/sessions")
def create_tasbeeh_session():
    data = request.get_json(silent=True) or {}
    zikr_name = (data.get("zikr_name") or "").strip()
    target = data.get("target_count", 33)
    if not zikr_name or len(zikr_name) > 200:
        return jsonify(error="invalid_zikr_name",
                       detail="zikr_name must be 1-200 characters."), 400
    if not isinstance(target, int) or target < 1 or target > 100000:
        return jsonify(error="invalid_target_count",
                       detail="target_count must be a positive integer."), 400
    try:
        session_id = db.execute(
            "INSERT INTO tasbeeh_sessions (zikr_name, target_count, current_count) "
            "VALUES (%s, %s, 0)", (zikr_name, target))
        return jsonify(status="ok", session_id=session_id, zikr_name=zikr_name,
                       target_count=target, current_count=0), 201
    except Error as exc:
        return _db_unavailable(exc)


@app.patch("/api/tasbeeh/sessions/<int:session_id>")
def update_tasbeeh_session(session_id):
    data = request.get_json(silent=True) or {}
    count = data.get("current_count")
    if not isinstance(count, int) or count < 0:
        return jsonify(error="invalid_current_count",
                       detail="current_count must be a non-negative integer."), 400
    try:
        session = db.fetch_one(
            "SELECT session_id, target_count, current_count, completed_at "
            "FROM tasbeeh_sessions WHERE session_id = %s", (session_id,))
        if not session:
            return jsonify(error="session_not_found"), 404
        is_complete = count >= session["target_count"]
        if session["completed_at"]:
            completed_at = session["completed_at"]
        elif is_complete:
            completed_at = datetime.now()
        else:
            completed_at = None
        db.execute(
            "UPDATE tasbeeh_sessions SET current_count = %s, completed_at = %s "
            "WHERE session_id = %s", (count, completed_at, session_id))
        return jsonify(status="ok", session_id=session_id, current_count=count,
                       target_count=session["target_count"],
                       completed_at=completed_at.isoformat() if completed_at else None,
                       is_complete=is_complete), 200
    except Error as exc:
        return _db_unavailable(exc)


@app.get("/api/tasbeeh/sessions")
def list_tasbeeh_sessions():
    date_filter = (request.args.get("date") or "").strip().lower()
    active_filter = (request.args.get("active") or "").strip().lower() == "true"
    try:
        limit = min(int(request.args.get("limit", 50)), 500)
    except (TypeError, ValueError):
        limit = 50
    sql = ("SELECT session_id, adhkar_id, zikr_name, target_count, current_count, "
           "started_at, completed_at FROM tasbeeh_sessions")
    conditions, params = [], []
    if date_filter == "today":
        conditions.append("started_at >= CURDATE() AND started_at < CURDATE() + INTERVAL 1 DAY")
    if active_filter:
        conditions.append("completed_at IS NULL")
    if conditions:
        sql += " WHERE " + " AND ".join(conditions)
    sql += " ORDER BY started_at DESC LIMIT %s"
    params.append(limit)
    try:
        rows = db.fetch_all(sql, tuple(params))
    except Error as exc:
        return _db_unavailable(exc)
    return jsonify(sessions=rows, count=len(rows)), 200


@app.get("/api/tasbeeh/sessions/active")
def get_active_tasbeeh_session():
    try:
        session = db.fetch_one(
            "SELECT session_id, adhkar_id, zikr_name, target_count, current_count, "
            "started_at, completed_at FROM tasbeeh_sessions "
            "WHERE started_at >= CURDATE() "
            "AND started_at < CURDATE() + INTERVAL 1 DAY "
            "AND completed_at IS NULL ORDER BY started_at DESC LIMIT 1")
        if not session:
            return jsonify(status="ok", session=None,
                           message="No active session today."), 200
        return jsonify(status="ok", session=session), 200
    except Error as exc:
        return _db_unavailable(exc)


# ===== BOOKMARKS =====

@app.get("/api/bookmarks")
def list_bookmarks():
    try:
        rows = db.fetch_all(
            "SELECT b.bookmark_id, b.item_type, b.adhkar_id, b.verse_id, b.note, b.created_at, "
            "a.title AS adhkar_title, a.arabic_text AS adhkar_arabic, "
            "a.translation AS adhkar_translation, v.verse_number AS verse_number, "
            "v.arabic_text AS verse_arabic, v.surah_id AS verse_surah_id, "
            "s.name_english AS verse_surah_name, s.name_arabic AS verse_surah_arabic "
            "FROM bookmarks b LEFT JOIN adhkar a ON a.adhkar_id = b.adhkar_id "
            "LEFT JOIN verses v ON v.verse_id = b.verse_id "
            "LEFT JOIN surahs s ON s.surah_id = v.surah_id "
            "ORDER BY b.created_at DESC")
    except Error as exc:
        return _db_unavailable(exc)
    return jsonify(bookmarks=rows, count=len(rows)), 200


@app.post("/api/bookmarks")
def create_bookmark():
    data = request.get_json(silent=True) or {}
    item_type = (data.get("item_type") or "").strip().lower()
    note = (data.get("note") or "").strip() or None
    if item_type not in ("adhkar", "verse"):
        return jsonify(error="invalid_item_type",
                       detail="item_type must be 'adhkar' or 'verse'."), 400
    if note and len(note) > 1000:
        return jsonify(error="note_too_long",
                       detail="note must be <= 1000 characters."), 400
    adhkar_id = data.get("adhkar_id")
    verse_id = data.get("verse_id")
    if item_type == "adhkar":
        if not isinstance(adhkar_id, int) or adhkar_id < 1:
            return jsonify(error="invalid_adhkar_id"), 400
        if verse_id is not None:
            return jsonify(error="verse_id_not_allowed",
                           detail="verse_id must not be set when item_type is 'adhkar'."), 400
    else:
        if not isinstance(verse_id, int) or verse_id < 1:
            return jsonify(error="invalid_verse_id"), 400
        if adhkar_id is not None:
            return jsonify(error="adhkar_id_not_allowed",
                           detail="adhkar_id must not be set when item_type is 'verse'."), 400
    try:
        if item_type == "adhkar":
            exists = db.fetch_one("SELECT adhkar_id FROM adhkar WHERE adhkar_id = %s",
                                  (adhkar_id,))
            if not exists:
                return jsonify(error="adhkar_not_found"), 404
            dup = db.fetch_one(
                "SELECT bookmark_id FROM bookmarks WHERE item_type='adhkar' AND adhkar_id=%s",
                (adhkar_id,))
        else:
            exists = db.fetch_one("SELECT verse_id FROM verses WHERE verse_id = %s",
                                  (verse_id,))
            if not exists:
                return jsonify(error="verse_not_found"), 404
            dup = db.fetch_one(
                "SELECT bookmark_id FROM bookmarks WHERE item_type='verse' AND verse_id=%s",
                (verse_id,))
        if dup:
            return jsonify(error="already_bookmarked",
                           existing_bookmark_id=dup["bookmark_id"]), 409
        bookmark_id = db.execute(
            "INSERT INTO bookmarks (item_type, adhkar_id, verse_id, note) "
            "VALUES (%s, %s, %s, %s)",
            (item_type,
             adhkar_id if item_type == "adhkar" else None,
             verse_id if item_type == "verse" else None,
             note))
        return jsonify(status="ok", bookmark_id=bookmark_id,
                       item_type=item_type, note=note), 201
    except Error as exc:
        return _db_unavailable(exc)


@app.delete("/api/bookmarks/<int:bookmark_id>")
def delete_bookmark(bookmark_id):
    try:
        exists = db.fetch_one("SELECT bookmark_id FROM bookmarks WHERE bookmark_id = %s",
                              (bookmark_id,))
        if not exists:
            return jsonify(error="bookmark_not_found"), 404
        db.execute("DELETE FROM bookmarks WHERE bookmark_id = %s", (bookmark_id,))
        return jsonify(status="ok", deleted=True, bookmark_id=bookmark_id), 200
    except Error as exc:
        return _db_unavailable(exc)


# ===== HADITH =====

@app.get("/api/hadith")
def list_hadith():
    topic = (request.args.get("topic") or "").strip().lower()
    search = (request.args.get("search") or "").strip().lower()
    sql = ("SELECT h.hadith_reference_id, h.source_id, h.collection_name, h.book_name, "
           "h.hadith_number, h.reference_url, h.grading, h.notes, "
           "h.title, h.topic, h.narrator, h.hadith_text_arabic, h.hadith_text_english, "
           "s.source_name, s.author_name, s.authenticity_grade "
           "FROM hadith_references h LEFT JOIN sources s ON s.source_id = h.source_id")
    params = []
    if search:
        sql += (" WHERE (LOWER(COALESCE(h.title,'')) LIKE %s "
                "OR LOWER(COALESCE(h.topic,'')) LIKE %s "
                "OR LOWER(COALESCE(h.narrator,'')) LIKE %s "
                "OR LOWER(COALESCE(h.hadith_text_english,'')) LIKE %s)")
        like = f"%{search}%"
        params.extend([like, like, like, like])
    sql += " ORDER BY h.hadith_reference_id ASC"
    try:
        rows = db.fetch_all(sql, tuple(params) if params else None)
    except Error as exc:
        return _db_unavailable(exc)
    if not rows:
        return jsonify(hadith=[], count=0,
                       message="No Hadith have been imported into the database yet."), 200
    if topic:
        rows = [r for r in rows if (r.get("topic") or "").lower() == topic]
    hadith_list = []
    for r in rows:
        display_source = " ".join(filter(None, [r["collection_name"], r["hadith_number"]]))
        hadith_list.append({
            "hadith_reference_id": r["hadith_reference_id"],
            "title": r["title"], "topic": r["topic"], "narrator": r["narrator"],
            "arabic_text": r["hadith_text_arabic"],
            "english_text": r["hadith_text_english"],
            "collection_name": r["collection_name"],
            "book_name": r["book_name"], "hadith_number": r["hadith_number"],
            "grading": r["grading"], "reference_url": r["reference_url"],
            "display_source": display_source,
            "source": {"source_id": r["source_id"], "source_name": r["source_name"],
                       "author_name": r["author_name"],
                       "authenticity_grade": r["authenticity_grade"]}
                      if r["source_id"] is not None else None,
        })
    return jsonify(hadith=hadith_list, count=len(hadith_list)), 200


# ===== ROUTINES =====

@app.get("/api/routines")
def list_routines():
    try:
        routines = db.fetch_all(
            "SELECT routine_id, routine_name, description, is_active, created_at "
            "FROM routines WHERE is_active = TRUE ORDER BY routine_id ASC")
    except Error as exc:
        return _db_unavailable(exc)
    if not routines:
        return jsonify(routines=[], count=0,
                       message="No routines have been created yet."), 200
    routine_ids = [r["routine_id"] for r in routines]
    placeholders = ",".join(["%s"] * len(routine_ids))
    try:
        items = db.fetch_all(
            f"SELECT ri.routine_item_id, ri.routine_id, ri.display_order, "
            f"ri.item_type, ri.target_count, ri.adhkar_id, ri.verse_id, "
            f"a.title AS adhkar_title, a.arabic_text AS adhkar_arabic, "
            f"v.verse_number AS verse_number, v.arabic_text AS verse_arabic, "
            f"s.name_english AS surah_name_english, s.name_arabic AS surah_name_arabic "
            f"FROM routine_items ri "
            f"LEFT JOIN adhkar a ON a.adhkar_id = ri.adhkar_id "
            f"LEFT JOIN verses v ON v.verse_id = ri.verse_id "
            f"LEFT JOIN surahs s ON s.surah_id = v.surah_id "
            f"WHERE ri.routine_id IN ({placeholders}) "
            f"ORDER BY ri.routine_id ASC, ri.display_order ASC", tuple(routine_ids))
    except Error as exc:
        return _db_unavailable(exc)
    items_by_routine = {}
    for it in items:
        items_by_routine.setdefault(it["routine_id"], []).append(it)
    result = []
    for r in routines:
        result.append({
            "routine_id": r["routine_id"], "routine_name": r["routine_name"],
            "description": r["description"], "is_active": bool(r["is_active"]),
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            "items": items_by_routine.get(r["routine_id"], []),
        })
    return jsonify(routines=result, count=len(result)), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="127.0.0.1", port=port, debug=True)