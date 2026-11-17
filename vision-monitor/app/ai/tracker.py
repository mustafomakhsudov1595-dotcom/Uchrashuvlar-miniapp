"""Oddiy, tez IoU asosidagi kuzatuvchi (har bir odamga barqaror track_id)."""
import time


def iou(a, b):
    x1, y1 = max(a[0], b[0]), max(a[1], b[1])
    x2, y2 = min(a[2], b[2]), min(a[3], b[3])
    inter = max(0, x2 - x1) * max(0, y2 - y1)
    ua = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / ua if ua > 0 else 0.0


class Track:
    def __init__(self, tid, box):
        self.id = tid
        self.box = box
        self.last_seen = time.time()
        self.employee_id = None
        self.name = None
        self.id_tries = 0
        self.next_id_try = 0.0
        self.jaw = []  # (ts, jawOpen)
        self.phone_hist = []  # (ts, 'call'|'use'|None)


class Tracker:
    def __init__(self, max_age=3.0, min_iou=0.25):
        self.tracks: dict[int, Track] = {}
        self.next = 1
        self.max_age = max_age
        self.min_iou = min_iou

    def update(self, boxes, ts=None):
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
        for i, b in enumerate(boxes):
            if i in assign:
                t = self.tracks[assign[i]]
                t.box = b
            else:
                t = Track(self.next, b)
                self.next += 1
                self.tracks[t.id] = t
            t.last_seen = ts
            out.append(t)
        for tid in [k for k, t in self.tracks.items() if ts - t.last_seen > self.max_age]:
            del self.tracks[tid]
        return out
