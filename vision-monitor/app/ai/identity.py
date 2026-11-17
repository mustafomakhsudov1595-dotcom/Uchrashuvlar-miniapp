"""Shaxsni aniqlash qoidalari. Asosiy tamoyil: XATO ISM QO'YGANDAN KO'RA "NOMA'LUM" DEB QOLDIRISH.

 1. Bitta kadrga ishonilmaydi: har bir track uchun so'nggi 12 ta yuz kuzatuvi "ovoz" sifatida yig'iladi.
 2. Kuzatuv ovoz beradi, agar: sifatli yuz, o'xshashlik >= ID_THRESHOLD va 1-o'rin 2-o'rindan >= ID_MARGIN yaxshi.
 3. Xodim tasdiqlanadi, agar >=3 ovoz, ovozlarning >=60% va o'rtacha o'xshashlik >= ID_THRESHOLD.
 4. Jins mos kelmasa (xodim jinsi ma'lum bo'lsa) va o'xshashlik juda yuqori bo'lmasa — nomzod rad etiladi.
 5. Bir kadrda bitta xodim ikki odamga berilmaydi (kuchlisi qoladi).
"""
import json
import time
from collections import deque

import numpy as np

from .. import config, db
from . import faces


class Bank:
    """Xodimlarning yuz vektorlari (30 soniyada bir yangilanadi)."""

    def __init__(self, user_id):
        self.user_id = user_id
        self.ts = 0.0
        self.people = []  # (id, name, gender, np.array[n,512])

    def load(self, force=False):
        if not force and time.time() - self.ts < 30:
            return self.people
        out = []
        for r in db.q("SELECT id,name,gender,embeddings FROM employees WHERE user_id=? AND active=1", (self.user_id,)):
            try:
                embs = json.loads(r["embeddings"] or "[]")
            except Exception:
                embs = []
            if embs:
                out.append((r["id"], r["name"], r["gender"], np.asarray(embs, dtype=np.float32)))
        self.people, self.ts = out, time.time()
        return out

    def rank(self, face):
        """[(score, id, name)] kamayish tartibida (jins filtri bilan)."""
        res = []
        for eid, name, gender, E in self.load():
            s = float(np.max(E @ face.emb))
            if gender and gender != face.gender and s < 0.62:
                continue  # jinsi mos emas
            res.append((s, eid, name))
        res.sort(reverse=True)
        return res


class TrackIdentity:
    def __init__(self):
        self.win = deque(maxlen=12)  # (employee_id | None, score)
        self.genders = deque(maxlen=15)
        self.ages = deque(maxlen=15)
        self.n_obs = 0
        self.employee_id = None
        self.name = None
        self.score = 0.0
        self.next_obs = 0.0
        self.unknown_saved = False
        self.best = None  # ko'rib chiqish uchun eng yaxshi yuz

    def observe(self, bank: Bank, face):
        self.n_obs += 1
        if face.crop is not None and face.good and (self.best is None or face.det * face.size > self.best.det * self.best.size):
            self.best = face
        self.genders.append(face.gender)
        self.ages.append(face.age)
        ranked = bank.rank(face)
        vote = None
        if ranked:
            s1, e1, n1 = ranked[0]
            s2 = ranked[1][0] if len(ranked) > 1 else -1.0
            if s1 >= config.ID_THRESHOLD and (s1 - s2) >= config.ID_MARGIN:
                vote = (e1, n1, s1)
        self.win.append((vote[0], vote[2], vote[1]) if vote else (None, 0.0, None))
        self._decide()

    def _decide(self):
        ids = [w[0] for w in self.win if w[0] is not None]
        prev = self.employee_id
        self.employee_id, self.name, self.score = None, None, 0.0
        if ids:
            top = max(set(ids), key=ids.count)
            sc = [w[1] for w in self.win if w[0] == top]
            if len(sc) >= 3 and len(sc) / len(self.win) >= 0.6 and float(np.mean(sc)) >= config.ID_THRESHOLD:
                self.employee_id = top
                self.name = next(w[2] for w in self.win if w[0] == top)
                self.score = float(np.mean(sc))
        return prev != self.employee_id

    def reset(self):
        self.win.clear()
        self.employee_id, self.name, self.score = None, None, 0.0

    @property
    def gender(self):
        if len(self.genders) < 2:
            return None
        g = max(set(self.genders), key=list(self.genders).count)
        return g if list(self.genders).count(g) / len(self.genders) >= 0.7 else None

    @property
    def age(self):
        return int(np.median(self.ages)) if self.ages else None

    @property
    def unknown_ready(self):
        """Tanilmagan va yetarli kuzatuv bor -> ko'rib chiqish ro'yxatiga qo'shish mumkin."""
        none = sum(1 for w in self.win if w[0] is None)
        return self.employee_id is None and self.n_obs >= 4 and none / max(1, len(self.win)) >= 0.7 and not self.unknown_saved
