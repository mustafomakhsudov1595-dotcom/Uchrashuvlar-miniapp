import os
import secrets
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
DATA = Path(os.environ.get("VM_DATA", BASE / "data")).resolve()
SNAPS = DATA / "snaps"
FACES = DATA / "faces"
MODELS = DATA / "models"
for p in (DATA, SNAPS, FACES, MODELS):
    p.mkdir(parents=True, exist_ok=True)

DB_PATH = DATA / "monitor.db"
WEB = BASE / "web"

TOKEN_HOURS = int(os.environ.get("VM_TOKEN_HOURS", "24"))
ANALYZE_FPS = float(os.environ.get("VM_FPS", "4"))
YOLO_MODEL = os.environ.get("VM_YOLO_MODEL", "yolov8n.pt")
DEVICE = os.environ.get("VM_DEVICE") or None


def _secret() -> str:
    if os.environ.get("VM_SECRET"):
        return os.environ["VM_SECRET"]
    f = DATA / "secret.key"
    if not f.exists():
        f.write_text(secrets.token_hex(32))
        try:
            f.chmod(0o600)
        except OSError:
            pass
    return f.read_text().strip()


SECRET = _secret()

# Model manzillari (birinchi ishga tushirishda avtomatik yuklab olinadi)
URL_FACE_LANDMARKER = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
URL_YUNET = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
URL_SFACE = "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx"

# RTSP uchun TCP (paket yo'qolishini kamaytiradi); cv2 import qilinishidan oldin o'rnatiladi
os.environ.setdefault("OPENCV_FFMPEG_CAPTURE_OPTIONS", "rtsp_transport;tcp|stimeout;8000000")
