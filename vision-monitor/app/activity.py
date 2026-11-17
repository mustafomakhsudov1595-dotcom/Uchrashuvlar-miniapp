"""Faoliyat intervallarini yozuvchi.

Har kadrda "mana shu odam shu holatda ko'rindi" deb chaqiriladi (see).
Holat `gap` soniyadan ko'proq ko'rinmasa interval yopiladi.
`min_len` dan qisqa intervallar (shovqin) o'chiriladi.
Ochiq interval har chaqiruvda yangilanadi — server o'chib qolsa ham ma'lumot yo'qolmaydi.
"""
import threading
import time

from . import db

KINDS = ("present", "phone_call", "phone_use", "talking")


class Recorder:
    def __init__(self, user_id: int, grace_sec: int = 90, min_event_sec: int = 3):
        self.user_id = user_id
        self.grace = grace_sec
        self.min_event = min_event_sec
        self.open: dict[tuple, dict] = {}
        self.lock = threading.Lock()

    def configure(self, grace_sec: int, min_event_sec: int):
        self.grace, self.min_event = grace_sec, min_event_sec

    def _gap(self, kind):
        return self.grace if kind == "present" else 4

    def _min(self, key):
        subject, kind = key
        if kind == "present":
            return 0 if subject[0] == "e" else 5  # noma'lum shaxslar uchun shovqin filtri
        return self.min_event

    def see(self, subject, label, camera_id, kind, ts=None):
        """subject: ('e', employee_id) yoki ('u', track_label). Qaytaradi: (interval_id, davomiyligi)."""
        ts = ts or time.time()
        key = (subject, kind)
        with self.lock:
            it = self.open.get(key)
            if it is None:
                emp = subject[1] if subject[0] == "e" else None
                iid = db.run(
                    "INSERT INTO intervals(user_id,employee_id,label,camera_id,kind,start_ts,end_ts) VALUES(?,?,?,?,?,?,?)",
                    (self.user_id, emp, label if emp is None else "", camera_id, kind, ts, ts),
                )
                it = {"id": iid, "start": ts, "last": ts, "written": ts}
                self.open[key] = it
            else:
                it["last"] = ts
                if ts - it["written"] >= 2:  # bazaga har 2 soniyada yozamiz
                    db.run("UPDATE intervals SET end_ts=? WHERE id=?", (ts, it["id"]))
                    it["written"] = ts
            return it["id"], it["last"] - it["start"]

    def sweep(self, ts=None, subject_filter=None):
        ts = ts or time.time()
        with self.lock:
            for key in list(self.open):
                if subject_filter and not subject_filter(key):
                    continue
                it = self.open[key]
                if ts - it["last"] > self._gap(key[1]):
                    self._close(key)

    def _close(self, key):
        it = self.open.pop(key)
        if it["last"] - it["start"] < self._min(key):
            db.run("DELETE FROM intervals WHERE id=?", (it["id"],))
        else:
            db.run("UPDATE intervals SET end_ts=? WHERE id=?", (it["last"], it["id"]))

    def close_all(self):
        with self.lock:
            for key in list(self.open):
                self._close(key)

    def reassign(self, old_subject, employee_id):
        """Track keyinroq tanib olinsa, avval 'noma'lum' yozilgan intervallarni xodimga o'tkazadi."""
        with self.lock:
            for key in [k for k in self.open if k[0] == old_subject]:
                it = self.open.pop(key)
                new_key = (("e", employee_id), key[1])
                if new_key in self.open:
                    db.run("DELETE FROM intervals WHERE id=?", (it["id"],))
                else:
                    db.run("UPDATE intervals SET employee_id=?, label='' WHERE id=?", (employee_id, it["id"]))
                    self.open[new_key] = it
