"""Yuz tahlili:
 - MediaPipe FaceLandmarker: jag' ochilishi (jawOpen) -> gaplashayotganini aniqlash
 - OpenCV YuNet + SFace: xodimni yuzidan tanish
"""
import json
import threading

import cv2
import numpy as np

from .. import config
from .models import ensure

_lm_lock = threading.Lock()
_landmarker = None
_lm_failed = None


def _get_landmarker():
    global _landmarker, _lm_failed
    if _landmarker is not None or _lm_failed:
        return _landmarker
    try:
        import mediapipe as mp
        from mediapipe.tasks import python as mpp
        from mediapipe.tasks.python import vision

        path = ensure(config.URL_FACE_LANDMARKER, "face_landmarker.task")
        opts = vision.FaceLandmarkerOptions(
            base_options=mpp.BaseOptions(model_asset_path=str(path)),
            running_mode=vision.RunningMode.IMAGE,
            num_faces=1,
            output_face_blendshapes=True,
            min_face_detection_confidence=0.4,
            min_face_presence_confidence=0.4,
        )
        _landmarker = vision.FaceLandmarker.create_from_options(opts)
    except Exception as e:  # noqa
        _lm_failed = str(e)
    return _landmarker


def jaw_open(bgr_crop):
    """Yuz kropidan jawOpen (0..1) qaytaradi; yuz topilmasa None."""
    lm = _get_landmarker()
    if lm is None or bgr_crop is None or bgr_crop.size == 0:
        return None
    import mediapipe as mp

    rgb = cv2.cvtColor(bgr_crop, cv2.COLOR_BGR2RGB)
    img = mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb))
    with _lm_lock:
        res = lm.detect(img)
    if not res.face_blendshapes:
        return None
    for c in res.face_blendshapes[0]:
        if c.category_name == "jawOpen":
            return float(c.score)
    return None


def landmarker_error():
    return _lm_failed


# ---------------- Yuzni tanish (SFace) ----------------
_fr_lock = threading.Lock()
_det = None
_rec = None
_fr_failed = None


def _get_fr():
    global _det, _rec, _fr_failed
    if _rec is not None or _fr_failed:
        return _det, _rec
    try:
        det_p = ensure(config.URL_YUNET, "face_detection_yunet_2023mar.onnx")
        rec_p = ensure(config.URL_SFACE, "face_recognition_sface_2021dec.onnx")
        _det = cv2.FaceDetectorYN.create(str(det_p), "", (320, 320), 0.7, 0.3, 5000)
        _rec = cv2.FaceRecognizerSF.create(str(rec_p), "")
    except Exception as e:  # noqa
        _fr_failed = str(e)
    return _det, _rec


def recognition_error():
    return _fr_failed


def embed(bgr):
    """Rasmdagi eng katta yuzning 128-o'lchamli vektori (yoki None)."""
    det, rec = _get_fr()
    if det is None or bgr is None or bgr.size == 0:
        return None
    h, w = bgr.shape[:2]
    scale = 1.0
    if max(h, w) < 160:  # juda kichik krop — kattalashtiramiz
        scale = 160 / max(h, w)
        bgr = cv2.resize(bgr, None, fx=scale, fy=scale)
        h, w = bgr.shape[:2]
    with _fr_lock:
        det.setInputSize((w, h))
        _, faces = det.detect(bgr)
        if faces is None or len(faces) == 0:
            return None
        f = max(faces, key=lambda r: r[2] * r[3])
        aligned = rec.alignCrop(bgr, f)
        feat = rec.feature(aligned)
    v = feat.flatten().astype(np.float32)
    return (v / (np.linalg.norm(v) + 1e-9)).tolist()


COSINE_THRESHOLD = 0.363  # SFace uchun tavsiya etilgan qiymat


def best_match(emb, employees):
    """employees: [(id, name, [emb,...])]. Qaytaradi (id, name, score) yoki None."""
    if emb is None:
        return None
    e = np.asarray(emb, dtype=np.float32)
    best = None
    for eid, name, embs in employees:
        for v in embs:
            s = float(np.dot(e, np.asarray(v, dtype=np.float32)))
            if best is None or s > best[2]:
                best = (eid, name, s)
    return best if best and best[2] >= COSINE_THRESHOLD else None


def load_employees(user_id):
    from .. import db

    out = []
    for r in db.q("SELECT id,name,embeddings FROM employees WHERE user_id=? AND active=1", (user_id,)):
        try:
            embs = json.loads(r["embeddings"] or "[]")
        except Exception:
            embs = []
        if embs:
            out.append((r["id"], r["name"], embs))
    return out
