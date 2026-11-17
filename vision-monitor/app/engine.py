"""Kamera ishchilari (har bir kamera uchun alohida oqim) va boshqaruvchi."""
import os
import random
import threading
import time

import cv2
import numpy as np

from . import db
from . import settings as settings_mod
from .activity import Recorder
from .ai import overlay
from .config import ANALYZE_FPS, SNAPS

_recorders: dict[int, Recorder] = {}
_workers: dict[int, "BaseWorker"] = {}
_lock = threading.Lock()


def recorder(user_id: int) -> Recorder:
    with _lock:
        r = _recorders.get(user_id)
        if r is None:
            s = settings_mod.get(user_id)
            r = Recorder(user_id, s["grace_sec"], s["min_event_sec"])
            _recorders[user_id] = r
        return r


def refresh_settings(user_id: int):
    s = settings_mod.get(user_id)
    recorder(user_id).configure(s["grace_sec"], s["min_event_sec"])


class BaseWorker(threading.Thread):
    def __init__(self, cam):
        super().__init__(daemon=True, name=f"cam-{cam['id']}")
        self.cam = dict(cam)
        self.stop_ev = threading.Event()
        self.status = "starting"
        self.error = ""
        self.fps = 0.0
        self.last_frame_ts = 0.0
        self.jpeg: bytes | None = None
        self.seq = 0
        self.cond = threading.Condition()
        self.people_now = 0

    def publish(self, frame):
        ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 72])
        if ok:
            with self.cond:
                self.jpeg = buf.tobytes()
                self.seq += 1
                self.cond.notify_all()
            self.last_frame_ts = time.time()

    def stop(self):
        self.stop_ev.set()

    def info(self):
        alive = self.last_frame_ts and time.time() - self.last_frame_ts < 15
        return dict(status=("online" if alive else self.status if self.status in ("error", "starting") else "offline"),
                    error=self.error, fps=round(self.fps, 1), people=self.people_now)

    def save_snapshot(self, frame, interval_id):
        name = f"{self.cam['user_id']}_{interval_id}.jpg"
        cv2.imwrite(str(SNAPS / name), frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        db.run("UPDATE intervals SET snapshot=? WHERE id=?", (name, interval_id))


def _is_file(src):
    return os.path.isfile(src)


class CameraWorker(BaseWorker):
    """Haqiqiy kamera: RTSP/HTTP oqimi, USB kamera (0,1..) yoki video fayl."""

    def run(self):
        from .ai.pipeline import Analyzer

        uid = self.cam["user_id"]
        rec = recorder(uid)
        src = self.cam["source"].strip()
        src_open = int(src) if src.isdigit() else src
        analyzer = None
        latest = {"f": None}
        overlay_state = {"items": [], "phones": []}
        reader_done = threading.Event()

        def reader():
            backoff = 2
            while not self.stop_ev.is_set():
                cap = cv2.VideoCapture(src_open)
                if not cap.isOpened():
                    self.status, self.error = "error", "Kameraga ulanib bo'lmadi (manzil, login/parol yoki tarmoqni tekshiring)"
                    cap.release()
                    self.stop_ev.wait(backoff)
                    backoff = min(30, backoff * 2)
                    continue
                backoff = 2
                self.status, self.error = "online", ""
                native = cap.get(cv2.CAP_PROP_FPS) or 25
                last_pub = 0
                while not self.stop_ev.is_set():
                    ok, f = cap.read()
                    if not ok:
                        if _is_file(src):  # fayl tugadi -> qaytadan
                            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                            continue
                        break
                    latest["f"] = f
                    now = time.time()
                    if now - last_pub >= 0.1:  # oqim ~10 kadr/s
                        view = f.copy()
                        overlay.draw(view, overlay_state["items"], overlay_state["phones"], time.strftime("%H:%M:%S"))
                        self.publish(view)
                        last_pub = now
                    if _is_file(src):
                        time.sleep(1 / native)
                cap.release()
                self.status, self.error = "error", "Oqim uzildi, qayta ulanmoqda..."
                self.stop_ev.wait(backoff)
            reader_done.set()

        threading.Thread(target=reader, daemon=True).start()
        snap_done: set[int] = set()
        period = 1.0 / ANALYZE_FPS
        frames, t0 = 0, time.time()
        while not self.stop_ev.is_set():
            t_start = time.time()
            f = latest["f"]
            if f is None:
                time.sleep(0.2)
                continue
            try:
                if analyzer is None:
                    analyzer = Analyzer(uid, settings_mod.get(uid)["talk_sensitivity"])
                items, phones = analyzer.process(f)
            except Exception as e:  # noqa — AI o'rnatilmagan bo'lishi mumkin
                self.status, self.error = "error", f"AI xatosi: {e}"
                self.stop_ev.wait(5)
                continue
            self.people_now = len(items)
            overlay_state["items"], overlay_state["phones"] = items, phones
            ts = time.time()
            for it in items:
                t = it["tobj"]
                if it["employee_id"]:
                    if t.__dict__.get("_unk_subject"):
                        rec.reassign(t._unk_subject, it["employee_id"])
                        t._unk_subject = None
                    subj, label = ("e", it["employee_id"]), ""
                else:
                    label = f"Noma'lum (kamera {self.cam['id']} #{t.id})"
                    subj = ("u", label)
                    t._unk_subject = subj
                rec.see(subj, label, self.cam["id"], "present", ts)
                for kind in it["state"]:
                    iid, age = rec.see(subj, label, self.cam["id"], kind, ts)
                    if age >= rec.min_event and iid not in snap_done:
                        snap_done.add(iid)
                        self.save_snapshot(f, iid)
            frames += 1
            if time.time() - t0 >= 5:
                self.fps, frames, t0 = frames / (time.time() - t0), 0, time.time()
            self.stop_ev.wait(max(0, period - (time.time() - t_start)))
        self.stop_ev.set()


# ------------------------------------------------------------------ DEMO
_SCENES = ["work", "work", "work", "phone_call", "phone_use", "talking", "away"]


class DemoWorker(BaseWorker):
    """Sinov rejimi: sun'iy kamera. Haqiqiy kameradagi kabi xuddi shu yozuvchi orqali
    xodimlar kelishi, telefon, gaplashish va chiqib ketishini simulyatsiya qiladi."""

    COLS = [(200, 120, 60), (80, 160, 230), (110, 200, 110), (180, 110, 200), (70, 190, 220), (150, 150, 240)]

    def run(self):
        uid = self.cam["user_id"]
        rec = recorder(uid)
        emps = [dict(r) for r in db.q("SELECT id,name FROM employees WHERE user_id=? AND active=1 ORDER BY id LIMIT 6", (uid,))]
        if not emps:
            emps = [dict(id=None, name=n) for n in ("Xodim 1", "Xodim 2", "Xodim 3")]
        rnd = random.Random(self.cam["id"])
        state = []
        for i, e in enumerate(emps):
            state.append(dict(e=e, scene="work", until=time.time() + rnd.uniform(15, 40), x=60 + i * 105, y=130 + (i % 2) * 60, i=i))
        self.status = "online"
        snap_done: set[int] = set()
        W, H = 720, 400
        while not self.stop_ev.is_set():
            ts = time.time()
            frame = np.full((H, W, 3), 38, np.uint8)
            for gx in range(0, W, 40):
                cv2.line(frame, (gx, 0), (gx, H), (46, 46, 46), 1)
            for gy in range(0, H, 40):
                cv2.line(frame, (0, gy), (W, gy), (46, 46, 46), 1)
            cv2.putText(frame, "DEMO KAMERA (sun'iy)", (12, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (160, 160, 160), 1, cv2.LINE_AA)
            items = []
            for s in state:
                if ts >= s["until"]:
                    s["scene"] = rnd.choice(_SCENES)
                    s["until"] = ts + (rnd.uniform(12, 30) if s["scene"] != "away" else rnd.uniform(12, 25))
                sc = s["scene"]
                if sc == "away":
                    continue
                x, y = int(s["x"] + 6 * np.sin(ts + s["i"])), s["y"]
                box = (x, y, x + 80, y + 190)
                cv2.rectangle(frame, (x + 22, y + 10), (x + 58, y + 50), self.COLS[s["i"] % 6], -1)
                cv2.rectangle(frame, (x + 8, y + 56), (x + 72, y + 180), self.COLS[s["i"] % 6], -1)
                st = {"work": set(), "phone_call": {"phone_call"}, "phone_use": {"phone_use"}, "talking": {"talking"}}[sc]
                items.append(dict(box=box, state=st, name=s["e"]["name"], track=s["i"] + 1))
                subj = ("e", s["e"]["id"]) if s["e"]["id"] else ("u", s["e"]["name"])
                label = "" if s["e"]["id"] else s["e"]["name"]
                rec.see(subj, label, self.cam["id"], "present", ts)
                for kind in st:
                    iid, age = rec.see(subj, label, self.cam["id"], kind, ts)
                    if age >= rec.min_event and iid not in snap_done:
                        snap_done.add(iid)
                        self.save_snapshot(overlay.draw(frame.copy(), items, []), iid)
            overlay.draw(frame, items, [], time.strftime("%H:%M:%S"))
            self.people_now = len(items)
            self.publish(frame)
            self.fps = 4.0
            self.stop_ev.wait(0.25)


# ------------------------------------------------------------------ manager
def start_camera(cam):
    stop_camera(cam["id"])
    if not cam["enabled"]:
        return
    w = DemoWorker(cam) if cam["source"].strip().lower() == "demo" else CameraWorker(cam)
    with _lock:
        _workers[cam["id"]] = w
    w.start()


def stop_camera(cid: int):
    with _lock:
        w = _workers.pop(cid, None)
    if w:
        w.stop()


def worker(cid: int):
    return _workers.get(cid)


def start_all():
    for r in db.q("SELECT * FROM cameras WHERE enabled=1"):
        start_camera(dict(r))
    threading.Thread(target=_housekeeping, daemon=True, name="housekeeping").start()


def _housekeeping():
    while True:
        time.sleep(2)
        try:
            for r in list(_recorders.values()):
                r.sweep()
        except Exception:
            pass


def shutdown():
    for cid in list(_workers):
        stop_camera(cid)
    for r in _recorders.values():
        r.close_all()
