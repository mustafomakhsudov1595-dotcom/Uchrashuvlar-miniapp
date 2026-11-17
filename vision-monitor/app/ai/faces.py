"""Yuz tahlili:
 - MediaPipe FaceLandmarker: jag' ochilishi (jawOpen) -> gaplashayotganini aniqlash
 - InsightFace (ArcFace): yuzni aniqlash, shaxs vektori (512), jins va yosh
"""
import json
import threading
import zipfile
from dataclasses import dataclass

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


# ---------------- Yuzni tanish, jins, yosh (InsightFace / ArcFace) ----------------
_fa_lock = threading.Lock()
_fa = None
_fa_failed = None

MIN_FACE_PX = 40
MIN_DET = 0.6


@dataclass
class Face:
    emb: np.ndarray  # normallashtirilgan 512 o'lchamli vektor
    gender: str  # 'M' | 'F'
    age: int
    det: float
    box: tuple
    crop: np.ndarray | None = None

    @property
    def size(self):
        return min(self.box[2] - self.box[0], self.box[3] - self.box[1])

    @property
    def good(self):
        return self.det >= MIN_DET and self.size >= MIN_FACE_PX


def _prepare_pack():
    root = config.MODELS / "models" / config.FACE_MODEL
    if not (root / "det_10g.onnx").exists() and not list(root.glob("det_*.onnx")):
        root.mkdir(parents=True, exist_ok=True)
        z = ensure(config.URL_FACE_PACK.format(config.FACE_MODEL), config.FACE_MODEL + ".zip")
        with zipfile.ZipFile(z) as zf:
            zf.extractall(root)
        z.unlink(missing_ok=True)


def _get_fa():
    global _fa, _fa_failed
    if _fa is not None or _fa_failed:
        return _fa
    try:
        from insightface.app import FaceAnalysis

        _prepare_pack()
        prov = ["CUDAExecutionProvider", "CPUExecutionProvider"] if (config.DEVICE or "").startswith("cuda") else ["CPUExecutionProvider"]
        fa = FaceAnalysis(name=config.FACE_MODEL, root=str(config.MODELS), allowed_modules=["detection", "recognition", "genderage"], providers=prov)
        fa.prepare(ctx_id=0 if prov[0].startswith("CUDA") else -1, det_size=(320, 320))
        _fa = fa
    except Exception as e:  # noqa
        _fa_failed = f"{type(e).__name__}: {e}"
    return _fa


def recognition_error():
    return _fa_failed


def analyze(bgr, with_crop=False):
    """Rasmdagi hamma yuzlar: vektor, jins, yosh. Katta yuzlar birinchi."""
    fa = _get_fa()
    if fa is None or bgr is None or bgr.size == 0:
        return []
    h, w = bgr.shape[:2]
    scale = 1.0
    if max(h, w) < 200:
        scale = 200 / max(h, w)
        bgr = cv2.resize(bgr, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    with _fa_lock:
        found = fa.get(bgr)
    out = []
    for f in found:
        b = tuple(int(v) for v in f.bbox)
        crop = None
        if with_crop:
            x1, y1, x2, y2 = b
            mx, my = int((x2 - x1) * 0.25), int((y2 - y1) * 0.25)
            crop = bgr[max(0, y1 - my) : y2 + my, max(0, x1 - mx) : x2 + mx].copy()
        out.append(Face(emb=np.asarray(f.normed_embedding, dtype=np.float32), gender="M" if int(f.gender) == 1 else "F",
                        age=int(f.age), det=float(f.det_score), box=b, crop=crop))
    out.sort(key=lambda x: -(x.box[2] - x.box[0]) * (x.box[3] - x.box[1]))
    return out
