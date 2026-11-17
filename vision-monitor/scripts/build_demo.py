"""Statik demo (Cloudflare Pages) yaratadi: haqiqiy backenddan demo hisobotlarni JSON ga yozadi.
Ishlatish:  python scripts/build_demo.py <chiqish_papkasi>
"""
import json
import os
import shutil
import sys
import tempfile
import time
from datetime import timedelta
from pathlib import Path

out = Path(sys.argv[1]).resolve()
tmp = tempfile.mkdtemp()
os.environ["VM_DATA"] = tmp
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app import db, demo, engine, reports, settings as st  # noqa: E402
from app.config import SNAPS  # noqa: E402
import cv2  # noqa: E402

db.init()
uid = db.run("INSERT INTO users(email,name,company,pw_hash,created_at) VALUES('demo@demo.uz','Demo foydalanuvchi','Demo kompaniya','x',?)", (time.time(),))
st.get(uid)
demo.seed(uid)
cam = dict(db.one("SELECT * FROM cameras WHERE user_id=?", (uid,)))
w = engine.DemoWorker(cam)
w.start()
time.sleep(45)  # isbot kadrlar yig'ilishi uchun
frame = w.jpeg
w.stop()
engine.recorder(uid).close_all()

tz = reports.tzinfo(st.get(uid)["tz"])
from datetime import datetime  # noqa: E402
today = datetime.now(tz).date()
data = dict(today=today.isoformat(), settings=st.get(uid), employees=[], days={}, events=reports.recent_events(uid, 40))
for r in db.q("SELECT * FROM employees WHERE user_id=? ORDER BY name", (uid,)):
    data["employees"].append(dict(id=r["id"], name=r["name"], position=r["position"], gender=r["gender"], faces=3, active=True))
for i in range(0, 14):
    d = today - timedelta(days=i)
    data["days"][d.isoformat()] = reports.build_day(uid, d)

if out.exists():
    shutil.rmtree(out)
shutil.copytree(Path(__file__).resolve().parent.parent / "web", out)
(out / "demo-data.json").write_text(json.dumps(data, ensure_ascii=False))
(out / "api" / "snap").mkdir(parents=True, exist_ok=True)
used = {e["snapshot"] for d in data["days"].values() for p in d["people"] for e in p["events"] if e["snapshot"]} | {e["snapshot"] for e in data["events"] if e["snapshot"]}
for n in used:
    if (SNAPS / n).exists():
        shutil.copy(SNAPS / n, out / "api" / "snap" / n)
(out / "api" / "cameras" / "1").mkdir(parents=True, exist_ok=True)
(out / "api" / "cameras" / "1" / "stream").write_bytes(frame)
(out / "_headers").write_text("/api/cameras/*/stream\n  Content-Type: image/jpeg\n/api/snap/*\n  Content-Type: image/jpeg\n")
shutil.copy(Path(__file__).resolve().parent / "demo-shim.js", out / "demo-shim.js")
ix = (out / "index.html").read_text().replace('<script src="app.js">', '<script src="demo-shim.js"></script>\n<script src="app.js">')
(out / "index.html").write_text(ix)
print("tayyor:", out, "| kunlar:", len(data["days"]), "| isbot rasmlar:", len(used))
