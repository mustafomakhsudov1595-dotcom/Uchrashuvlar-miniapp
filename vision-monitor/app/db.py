import sqlite3
import threading
from contextlib import contextmanager

from .config import DB_PATH

_local = threading.local()

SCHEMA = """
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  company TEXT DEFAULT '',
  pw_hash TEXT NOT NULL,
  created_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS settings(
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  work_start TEXT NOT NULL DEFAULT '09:00',
  work_end TEXT NOT NULL DEFAULT '18:00',
  grace_sec INTEGER NOT NULL DEFAULT 90,
  min_event_sec INTEGER NOT NULL DEFAULT 3,
  talk_sensitivity REAL NOT NULL DEFAULT 1.0,
  tz TEXT NOT NULL DEFAULT 'Asia/Tashkent'
);
CREATE TABLE IF NOT EXISTS cameras(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'office',
  enabled INTEGER NOT NULL DEFAULT 1,
  ingest_key TEXT NOT NULL DEFAULT '',
  created_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS employees(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position TEXT DEFAULT '',
  embeddings TEXT DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1,
  gender TEXT NOT NULL DEFAULT '',
  created_at REAL NOT NULL
);
-- kind: present | phone_call | phone_use | talking
CREATE TABLE IF NOT EXISTS intervals(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  employee_id INTEGER,
  label TEXT DEFAULT '',
  camera_id INTEGER,
  kind TEXT NOT NULL,
  start_ts REAL NOT NULL,
  end_ts REAL NOT NULL,
  snapshot TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS unknown_faces(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  camera_id INTEGER,
  label TEXT NOT NULL DEFAULT '',
  gender TEXT DEFAULT '',
  age INTEGER DEFAULT 0,
  embedding TEXT NOT NULL,
  photo TEXT NOT NULL,
  first_ts REAL NOT NULL,
  last_ts REAL NOT NULL,
  seen INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending'
);
CREATE INDEX IF NOT EXISTS ix_unk ON unknown_faces(user_id,status,last_ts);
CREATE INDEX IF NOT EXISTS ix_int_user_time ON intervals(user_id, start_ts, end_ts);
CREATE INDEX IF NOT EXISTS ix_int_emp ON intervals(employee_id, kind, start_ts);
"""


def conn() -> sqlite3.Connection:
    c = getattr(_local, "c", None)
    if c is None:
        c = sqlite3.connect(DB_PATH, timeout=30, isolation_level=None)
        c.row_factory = sqlite3.Row
        c.execute("PRAGMA journal_mode=WAL")
        c.execute("PRAGMA foreign_keys=ON")
        c.execute("PRAGMA synchronous=NORMAL")
        _local.c = c
    return c


def init():
    conn().executescript(SCHEMA)
    # eski bazalarni yangilash
    for tbl, col, ddl in (("employees", "gender", "TEXT NOT NULL DEFAULT ''"), ("cameras", "ingest_key", "TEXT NOT NULL DEFAULT ''")):
        cols = [r["name"] for r in conn().execute(f"PRAGMA table_info({tbl})")]
        if col not in cols:
            conn().execute(f"ALTER TABLE {tbl} ADD COLUMN {col} {ddl}")


def q(sql, args=()):
    return conn().execute(sql, args).fetchall()


def one(sql, args=()):
    return conn().execute(sql, args).fetchone()


def run(sql, args=()):
    cur = conn().execute(sql, args)
    return cur.lastrowid


@contextmanager
def tx():
    c = conn()
    c.execute("BEGIN")
    try:
        yield c
        c.execute("COMMIT")
    except Exception:
        c.execute("ROLLBACK")
        raise
