import json
import os
import re
import time
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta

import cv2
import numpy as np
from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import auth, db, demo, engine, reports
from . import settings as settings_mod
from .config import FACES, SNAPS, WEB


@asynccontextmanager
async def lifespan(app):
    db.init()
    engine.start_all()
    yield
    engine.shutdown()


app = FastAPI(title="Vision Monitor", lifespan=lifespan)
User = Depends(auth.current_user)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    resp = await call_next(request)
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Referrer-Policy"] = "same-origin"
    if request.url.path.startswith("/api/"):
        resp.headers["Cache-Control"] = "no-store"
    return resp


# ------------------------------------------------------------------ auth
class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    company: str = Field(default="", max_length=120)
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=120)
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: str
    password: str


@app.post("/api/auth/register")
def register(b: RegisterIn):
    email = b.email.strip().lower()
    if db.one("SELECT id FROM users WHERE email=?", (email,)):
        raise HTTPException(409, "Bu email bilan hisob allaqachon mavjud")
    uid = db.run("INSERT INTO users(email,name,company,pw_hash,created_at) VALUES(?,?,?,?,?)",
                 (email, b.name.strip(), b.company.strip(), auth.hash_pw(b.password), time.time()))
    settings_mod.get(uid)
    return dict(token=auth.make_token(uid))


@app.post("/api/auth/login")
def login(b: LoginIn, request: Request):
    email = b.email.strip().lower()
    key = f"{email}|{request.client.host if request.client else ''}"
    auth.throttle_check(key)
    u = db.one("SELECT * FROM users WHERE email=?", (email,))
    if not u or not auth.check_pw(b.password, u["pw_hash"]):
        auth.throttle_fail(key)
        raise HTTPException(401, "Email yoki parol noto'g'ri")
    auth.throttle_ok(key)
    return dict(token=auth.make_token(u["id"]))


@app.get("/api/me")
def me(u=User):
    return u


# ------------------------------------------------------------------ cameras
ALLOWED_SRC = re.compile(r"^(rtsp|rtsps|http|https|rtmp)://\S+$|^\d{1,2}$|^demo$", re.I)


def mask(src: str) -> str:
    return re.sub(r"(://[^:/@\s]+:)[^@/\s]+@", r"\1***@", src)


class CameraIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    source: str = Field(min_length=1, max_length=500)
    role: str = Field(default="office", pattern="^(office|entrance)$")
    enabled: bool = True


def _cam_out(r):
    d = dict(r)
    w = engine.worker(d["id"])
    info = w.info() if w else dict(status="disabled" if not d["enabled"] else "offline", error="", fps=0, people=0)
    d["source"] = mask(d["source"])
    d.update(info)
    return d


def _check_src(src: str):
    s = src.strip()
    if not ALLOWED_SRC.match(s):
        raise HTTPException(400, "Manba noto'g'ri. Misol: rtsp://login:parol@192.168.1.10:554/stream1, http://..., 0 (USB kamera) yoki demo")
    return s


@app.get("/api/cameras")
def cameras(u=User):
    return [_cam_out(r) for r in db.q("SELECT * FROM cameras WHERE user_id=? ORDER BY id", (u["id"],))]


@app.post("/api/cameras")
def add_camera(b: CameraIn, u=User):
    src = _check_src(b.source)
    cid = db.run("INSERT INTO cameras(user_id,name,source,role,enabled,created_at) VALUES(?,?,?,?,?,?)",
                 (u["id"], b.name.strip(), src, b.role, int(b.enabled), time.time()))
    engine.start_camera(dict(db.one("SELECT * FROM cameras WHERE id=?", (cid,))))
    return _cam_out(db.one("SELECT * FROM cameras WHERE id=?", (cid,)))


def _own_cam(cid, u):
    r = db.one("SELECT * FROM cameras WHERE id=? AND user_id=?", (cid, u["id"]))
    if not r:
        raise HTTPException(404, "Kamera topilmadi")
    return r


@app.put("/api/cameras/{cid}")
def edit_camera(cid: int, b: CameraIn, u=User):
    old = _own_cam(cid, u)
    src = old["source"] if b.source.strip() == mask(old["source"]) else _check_src(b.source)
    db.run("UPDATE cameras SET name=?,source=?,role=?,enabled=? WHERE id=?", (b.name.strip(), src, b.role, int(b.enabled), cid))
    engine.start_camera(dict(db.one("SELECT * FROM cameras WHERE id=?", (cid,))))
    return _cam_out(db.one("SELECT * FROM cameras WHERE id=?", (cid,)))


@app.delete("/api/cameras/{cid}")
def del_camera(cid: int, u=User):
    _own_cam(cid, u)
    engine.stop_camera(cid)
    db.run("DELETE FROM cameras WHERE id=?", (cid,))
    return dict(ok=True)


class TestIn(BaseModel):
    source: str


@app.post("/api/cameras/test")
def test_camera(b: TestIn, u=User):
    src = _check_src(b.source)
    if src.lower() == "demo":
        return dict(ok=True, message="Demo manba tayyor")
    cap = cv2.VideoCapture(int(src) if src.isdigit() else src)
    try:
        if not cap.isOpened():
            return dict(ok=False, message="Kameraga ulanib bo'lmadi. Manzil, login/parol va tarmoqni tekshiring.")
        for _ in range(5):
            ok, f = cap.read()
            if ok:
                h, w = f.shape[:2]
                return dict(ok=True, message=f"Ulanish muvaffaqiyatli ({w}x{h})")
        return dict(ok=False, message="Kameraga ulandi, lekin tasvir kelmadi.")
    finally:
        cap.release()


@app.get("/api/cameras/{cid}/stream")
def stream(cid: int, u=User):
    _own_cam(cid, u)
    w = engine.worker(cid)
    if not w:
        raise HTTPException(409, "Kamera o'chirilgan")

    def gen():
        last = -1
        while not w.stop_ev.is_set():
            with w.cond:
                w.cond.wait_for(lambda: w.seq != last or w.stop_ev.is_set(), timeout=5)
                data, last = w.jpeg, w.seq
            if data is None:
                continue
            yield b"--frame\r\nContent-Type: image/jpeg\r\nContent-Length: " + str(len(data)).encode() + b"\r\n\r\n" + data + b"\r\n"

    return StreamingResponse(gen(), media_type="multipart/x-mixed-replace; boundary=frame")


@app.get("/api/cameras/{cid}/snapshot")
def cam_snapshot(cid: int, u=User):
    _own_cam(cid, u)
    w = engine.worker(cid)
    if not w or not w.jpeg:
        raise HTTPException(404, "Tasvir yo'q")
    return Response(w.jpeg, media_type="image/jpeg")


# ------------------------------------------------------------------ employees
class EmployeeIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    position: str = Field(default="", max_length=80)


def _emp_out(r):
    n = len(json.loads(r["embeddings"] or "[]"))
    return dict(id=r["id"], name=r["name"], position=r["position"], faces=n, active=bool(r["active"]))


def _own_emp(eid, u):
    r = db.one("SELECT * FROM employees WHERE id=? AND user_id=?", (eid, u["id"]))
    if not r:
        raise HTTPException(404, "Xodim topilmadi")
    return r


@app.get("/api/employees")
def employees(u=User):
    return [_emp_out(r) for r in db.q("SELECT * FROM employees WHERE user_id=? AND active=1 ORDER BY name", (u["id"],))]


@app.post("/api/employees")
def add_employee(b: EmployeeIn, u=User):
    eid = db.run("INSERT INTO employees(user_id,name,position,created_at) VALUES(?,?,?,?)", (u["id"], b.name.strip(), b.position.strip(), time.time()))
    return _emp_out(db.one("SELECT * FROM employees WHERE id=?", (eid,)))


@app.put("/api/employees/{eid}")
def edit_employee(eid: int, b: EmployeeIn, u=User):
    _own_emp(eid, u)
    db.run("UPDATE employees SET name=?,position=? WHERE id=?", (b.name.strip(), b.position.strip(), eid))
    return _emp_out(db.one("SELECT * FROM employees WHERE id=?", (eid,)))


@app.delete("/api/employees/{eid}")
def del_employee(eid: int, u=User):
    _own_emp(eid, u)
    # tarixiy hisobotlar saqlanib qoladi: faqat nofaol qilinadi
    db.run("UPDATE employees SET active=0, embeddings='[]' WHERE id=?", (eid,))
    return dict(ok=True)


@app.post("/api/employees/{eid}/faces")
async def add_faces(eid: int, files: list[UploadFile] = File(...), u=User):
    from .ai import faces

    r = _own_emp(eid, u)
    embs = json.loads(r["embeddings"] or "[]")
    added, failed = 0, 0
    for f in files[:10]:
        data = await f.read()
        if len(data) > 8_000_000:
            failed += 1
            continue
        img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
        if img is None:
            failed += 1
            continue
        v = faces.embed(img)
        if v is None:
            if faces.recognition_error():
                raise HTTPException(503, f"Yuzni tanish modeli yuklanmadi: {faces.recognition_error()}")
            failed += 1
            continue
        embs.append(v)
        added += 1
    embs = embs[-12:]
    db.run("UPDATE employees SET embeddings=? WHERE id=?", (json.dumps(embs), eid))
    return dict(added=added, failed=failed, total=len(embs))


@app.delete("/api/employees/{eid}/faces")
def clear_faces(eid: int, u=User):
    _own_emp(eid, u)
    db.run("UPDATE employees SET embeddings='[]' WHERE id=?", (eid,))
    return dict(ok=True)


# ------------------------------------------------------------------ settings
class SettingsIn(BaseModel):
    work_start: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    work_end: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    grace_sec: int = Field(ge=15, le=1800)
    min_event_sec: int = Field(ge=1, le=60)
    talk_sensitivity: float = Field(ge=0.3, le=3.0)
    tz: str = Field(max_length=60)


@app.get("/api/settings")
def get_settings(u=User):
    return settings_mod.get(u["id"])


@app.put("/api/settings")
def put_settings(b: SettingsIn, u=User):
    try:
        reports.ZoneInfo(b.tz)
    except Exception:
        raise HTTPException(400, "Vaqt mintaqasi noto'g'ri (masalan: Asia/Tashkent)")
    settings_mod.get(u["id"])
    db.run("UPDATE settings SET work_start=?,work_end=?,grace_sec=?,min_event_sec=?,talk_sensitivity=?,tz=? WHERE user_id=?",
           (b.work_start, b.work_end, b.grace_sec, b.min_event_sec, b.talk_sensitivity, b.tz, u["id"]))
    engine.refresh_settings(u["id"])
    return settings_mod.get(u["id"])


# ------------------------------------------------------------------ reports
def _date(s: str | None, default: date) -> date:
    if not s:
        return default
    try:
        return date.fromisoformat(s)
    except ValueError:
        raise HTTPException(400, "Sana formati noto'g'ri (YYYY-MM-DD)")


def _today(u):
    return datetime.now(reports.tzinfo(settings_mod.get(u["id"])["tz"])).date()


@app.get("/api/reports/day")
def report_day(date: str | None = None, u=User):
    return reports.build_day(u["id"], _date(date, _today(u)))


@app.get("/api/reports/range")
def report_range(start: str | None = None, end: str | None = None, u=User):
    t = _today(u)
    e = _date(end, t)
    s = _date(start, e - timedelta(days=6))
    if s > e:
        raise HTTPException(400, "Boshlanish sanasi tugash sanasidan keyin bo'lishi mumkin emas")
    return reports.build_range(u["id"], s, e)


@app.get("/api/reports/csv")
def report_csv(start: str | None = None, end: str | None = None, u=User):
    t = _today(u)
    e = _date(end, t)
    s = _date(start, e)
    body = reports.to_csv(u["id"], s, e)
    return Response(body, media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="hisobot_{s}_{e}.csv"'})


@app.get("/api/events")
def events(limit: int = 30, u=User):
    return reports.recent_events(u["id"], max(1, min(limit, 100)))


@app.get("/api/snap/{name}")
def snap(name: str, u=User):
    if not re.fullmatch(r"\d+_\d+\.jpg", name) or not name.startswith(f"{u['id']}_"):
        raise HTTPException(404)
    p = SNAPS / name
    if not p.exists():
        raise HTTPException(404)
    return FileResponse(p, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=86400"})


# ------------------------------------------------------------------ system / demo
@app.get("/api/system")
def system(u=User):
    def has(m):
        import importlib.util
        return importlib.util.find_spec(m) is not None
    return dict(yolo=has("ultralytics"), mediapipe=has("mediapipe"),
                cameras_running=len([1 for r in db.q("SELECT id FROM cameras WHERE user_id=?", (u["id"],)) if engine.worker(r["id"])]))


@app.post("/api/demo/seed")
def demo_seed(u=User):
    demo.seed(u["id"])
    for r in db.q("SELECT * FROM cameras WHERE user_id=? AND source='demo'", (u["id"],)):
        engine.start_camera(dict(r))
    return dict(ok=True)


# ------------------------------------------------------------------ web
app.mount("/", StaticFiles(directory=WEB, html=True), name="web")
