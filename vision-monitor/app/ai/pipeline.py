"""Bitta kadrni tahlil qilib, har bir odam uchun holatni aniqlaydi:
   present / phone_call / phone_use / talking
"""
import time

import numpy as np

from . import detector, faces
from .tracker import Tracker

WINDOW = 2.5  # soniya: gaplashishni baholash oynasi


def _center(b):
    return (b[0] + b[2]) / 2, (b[1] + b[3]) / 2


def assign_phones(person_boxes, phones):
    """Har bir telefonni o'z egasiga biriktiradi (markazi odam qutisi ichida / yaqinida)."""
    owner = {}
    for pi, ph in enumerate(phones):
        cx, cy = _center(ph)
        best, best_d = None, 1e9
        for i, p in enumerate(person_boxes):
            w, h = p[2] - p[0], p[3] - p[1]
            if p[0] - 0.25 * w <= cx <= p[2] + 0.25 * w and p[1] - 0.1 * h <= cy <= p[3] + 0.1 * h:
                pcx, pcy = _center(p)
                d = (cx - pcx) ** 2 + (cy - pcy) ** 2
                if d < best_d:
                    best, best_d = i, d
        if best is not None:
            owner[pi] = best
    return owner


def phone_mode(person_box, phone_box):
    """Telefon boshga yaqin -> 'call' (quloqda gaplashyapti), aks holda 'use' (qo'lda, ekranga qarayapti)."""
    h = person_box[3] - person_box[1]
    cy = _center(phone_box)[1]
    return "call" if cy < person_box[1] + 0.34 * h else "use"


class Analyzer:
    def __init__(self, user_id, talk_sensitivity=1.0):
        self.user_id = user_id
        self.tracker = Tracker()
        self.sens = max(0.3, talk_sensitivity)
        self._emps = []
        self._emps_ts = 0.0

    def employees(self):
        if time.time() - self._emps_ts > 30:
            self._emps = faces.load_employees(self.user_id)
            self._emps_ts = time.time()
        return self._emps

    def process(self, frame):
        """Qaytaradi: [{track, box, state(set), name, employee_id}]"""
        ts = time.time()
        persons, phones = detector.detect(frame)
        pboxes = [p[:4] for p in persons]
        tracks = self.tracker.update(pboxes, ts)
        owners = assign_phones(pboxes, [p[:4] for p in phones])
        H, W = frame.shape[:2]
        out = []
        for i, t in enumerate(tracks):
            x1, y1, x2, y2 = [int(v) for v in t.box]
            x1, y1, x2, y2 = max(0, x1), max(0, y1), min(W, x2), min(H, y2)
            head = frame[y1 : y1 + max(1, int((y2 - y1) * 0.5)), x1:x2]

            # ---- kim ekanini aniqlash (yuz orqali), har 2 soniyada, 8 martagacha
            if t.employee_id is None and t.id_tries < 8 and ts >= t.next_id_try and self.employees():
                t.id_tries += 1
                t.next_id_try = ts + 2
                m = faces.best_match(faces.embed(head), self.employees())
                if m:
                    t.employee_id, t.name = m[0], m[1]

            # ---- telefon
            mode = None
            for pi, oi in owners.items():
                if oi == i:
                    mm = phone_mode(pboxes[i], phones[pi][:4])
                    if mm == "call" or mode is None:
                        mode = mm
            t.phone_hist.append((ts, mode))
            t.phone_hist = [(a, b) for a, b in t.phone_hist if ts - a <= 1.5]
            votes = [b for _, b in t.phone_hist if b]
            state = set()
            if len(votes) >= max(1, len(t.phone_hist) // 3):
                state.add("phone_call" if votes.count("call") >= votes.count("use") else "phone_use")

            # ---- gaplashish (og'iz harakati)
            if "phone_call" not in state:
                j = faces.jaw_open(head)
                if j is not None:
                    t.jaw.append((ts, j))
                t.jaw = [(a, b) for a, b in t.jaw if ts - a <= WINDOW]
                if len(t.jaw) >= 5:
                    v = np.array([b for _, b in t.jaw])
                    if v.std() > 0.03 / self.sens and v.max() > 0.07:
                        state.add("talking")
            out.append(dict(track=t.id, box=(x1, y1, x2, y2), state=state, name=t.name,
                            employee_id=t.employee_id, tobj=t))
        return out, [p[:4] for p in phones]
