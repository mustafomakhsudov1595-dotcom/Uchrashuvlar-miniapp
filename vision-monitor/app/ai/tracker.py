"""IoU + tashqi ko'rinish (kiyim rangi) asosidagi kuzatuvchi.
Odam bir necha soniya to'siq ortida qolib qaytsa, xuddi shu track (va aniqlangan shaxsi) tiklanadi.
"""
import time

import cv2
import numpy as np

REVIVE_SEC = 12.0


def iou(a, b):
    x1, y1 = max(a[0], b[0]), max(a[1], b[1])
    x2, y2 = min(a[2], b[2]), min(a[3], b[3])
    inter = max(0, x2 - x1) * max(0, y2 - y1)
    ua = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / ua if ua > 0 else 0.0


def torso_hist(frame, box):
    x1, y1, x2, y2 = [int(v) for v in box]
    h, w = y2 - y1, x2 - x1
    roi = frame[max(0, y1 + int(h * 0.25)) : max(1, y1 + int(h * 0.65)), max(0, x1 + int(w * 0.2)) : max(1, x1 + int(w * 0.8))]
    if roi.size == 0:
        return None
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    hist = cv2.calcHist([hsv], [0, 1], None, [16, 8], [0, 180, 0, 256])
    cv2.normalize(hist, hist, 1, 0, cv2.NORM_L1)
    return hist


def hist_sim(a, b):
    if a is None or b is None:
        return 0.0
    return float(cv2.compareHist(a, b, cv2.HISTCMP_CORREL))


class Track:
    def __init__(self, tid, box):
        from .identity import TrackIdentity

        self.id = tid
        self.box = box
        self.last_seen = time.time()
        self.hist = None
        self.ident = TrackIdentity()
        self.jaw = []
        self.phone_hist = []
        self.unk_subject = None

    @property
    def employee_id(self):
        return self.ident.employee_id

    @property
    def name(self):
        return self.ident.name


class Tracker:
    def __init__(self, max_age=2.0, min_iou=0.25):
        self.tracks: dict[int, Track] = {}
        self.lost: list[Track] = []
        self.next = 1
        self.max_age = max_age
        self.min_iou = min_iou

    def update(self, boxes, ts=None, frame=None):
        ts = ts or time.time()
        pairs = []
        for i, b in enumerate(boxes):
            for t in self.tracks.values():
                s = iou(b, t.box)
                if s >= self.min_iou:
                    pairs.append((s, i, t.id))
        pairs.sort(reverse=True)
        used_b, used_t, assign = set(), set(), {}
        for s, i, tid in pairs:
            if i in used_b or tid in used_t:
                continue
            used_b.add(i)
            used_t.add(tid)
            assign[i] = tid
        out = []
        revived = set()
        for i, b in enumerate(boxes):
            hist = torso_hist(frame, b) if frame is not None else None
            if i in assign:
                t = self.tracks[assign[i]]
                t.box = b
            else:
                t = self._revive(b, hist, ts, revived)
                if t is None:
                    t = Track(self.next, b)
                    self.next += 1
                t.box = b
                self.tracks[t.id] = t
            if hist is not None:
                t.hist = hist if t.hist is None else cv2.addWeighted(t.hist, 0.8, hist, 0.2, 0)
            t.last_seen = ts
            out.append(t)
        for tid in [k for k, t in self.tracks.items() if ts - t.last_seen > self.max_age]:
            self.lost.append(self.tracks.pop(tid))
        self.lost = [t for t in self.lost if ts - t.last_seen <= REVIVE_SEC]
        return out

    def _revive(self, box, hist, ts, revived):
        if hist is None:
            return None
        cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
        size = max(box[2] - box[0], box[3] - box[1])
        best, best_s = None, 0.85
        for t in self.lost:
            if t.id in revived:
                continue
            tx, ty = (t.box[0] + t.box[2]) / 2, (t.box[1] + t.box[3]) / 2
            if ((cx - tx) ** 2 + (cy - ty) ** 2) ** 0.5 > 2.0 * size:
                continue
            s = hist_sim(hist, t.hist)
            if s > best_s:
                best, best_s = t, s
        if best:
            revived.add(best.id)
            self.lost.remove(best)
        return best
