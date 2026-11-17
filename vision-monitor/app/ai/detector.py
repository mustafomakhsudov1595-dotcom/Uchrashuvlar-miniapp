"""YOLO: odam (person) va telefon (cell phone) aniqlash."""
import os
import threading

from ..config import DEVICE, MODELS, YOLO_MODEL

PERSON, PHONE = 0, 67
_lock = threading.Lock()
_model = None


def _get():
    global _model
    with _lock:
        if _model is None:
            from ultralytics import YOLO  # kech import: AI o'rnatilmagan bo'lsa ham server ishlaydi

            _model = YOLO(YOLO_MODEL if os.path.dirname(YOLO_MODEL) else str(MODELS / YOLO_MODEL))
        return _model


def detect(frame):
    """Qaytaradi: (persons[(x1,y1,x2,y2,conf)], phones[(x1,y1,x2,y2,conf)])"""
    m = _get()
    with _lock:  # modelni bir vaqtda faqat bitta kamera ishlatadi
        res = m.predict(frame, classes=[PERSON, PHONE], conf=0.25, imgsz=640, verbose=False, device=DEVICE)[0]
    persons, phones = [], []
    for b in res.boxes:
        x1, y1, x2, y2 = [float(v) for v in b.xyxy[0].tolist()]
        c = float(b.conf[0])
        cls = int(b.cls[0])
        if cls == PERSON and c >= 0.4 and (y2 - y1) > 40:
            persons.append((x1, y1, x2, y2, c))
        elif cls == PHONE:
            phones.append((x1, y1, x2, y2, c))
    return persons, phones
