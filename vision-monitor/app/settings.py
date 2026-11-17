from . import db

DEFAULTS = dict(work_start="09:00", work_end="18:00", grace_sec=90, min_event_sec=3, talk_sensitivity=1.0, tz="Asia/Tashkent")


def get(user_id: int) -> dict:
    r = db.one("SELECT * FROM settings WHERE user_id=?", (user_id,))
    if not r:
        db.run("INSERT OR IGNORE INTO settings(user_id) VALUES(?)", (user_id,))
        r = db.one("SELECT * FROM settings WHERE user_id=?", (user_id,))
    d = dict(r)
    d.pop("user_id", None)
    return d
