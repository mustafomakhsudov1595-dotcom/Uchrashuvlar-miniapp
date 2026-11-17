#!/usr/bin/env python3
"""VisionMonitor — IP kamera ko'prigi (ofis/ko'cha kameralari uchun).

Kameraning RTSP oqimini o'qiydi va shu kompyuterning ichida (127.0.0.1) oddiy kadr sifatida beradi.
VisionMonitor monitor sahifasi (Chrome/Edge) shu kadrlarni o'qib, AI tahlilini bajaradi.
Hech qanday port internetga ochilmaydi: faqat shu kompyuterning o'zi ko'ra oladi.

Kerak: Python 3.9+, `pip install opencv-python-headless`
Ishga tushirish (kamera IP manzili bilan — yo'lni o'zi topadi):
    python ipcam_bridge.py --ip 192.168.1.64 --user admin --password PAROL
Yoki aniq manzil bilan:
    python ipcam_bridge.py --source "rtsp://admin:PAROL@192.168.1.64:554/Streaming/Channels/101"
"""
import argparse
import json
import os
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import quote

os.environ.setdefault("OPENCV_FFMPEG_CAPTURE_OPTIONS", "rtsp_transport;tcp|stimeout;6000000")
import cv2  # noqa: E402

PATHS = [
    "/Streaming/Channels/101", "/Streaming/Channels/102", "/h264/ch1/main/av_stream",          # Hikvision / EZVIZ
    "/cam/realmonitor?channel=1&subtype=0", "/cam/realmonitor?channel=1&subtype=1",            # Dahua / Imou
    "/stream1", "/stream2",                                                                      # TP-Link Tapo
    "/h264Preview_01_main", "/h264Preview_01_sub",                                               # Reolink
    "/media/video1", "/media/video2",                                                            # Uniview
    "/user={u}&password={p}&channel=1&stream=0.sdp?real_stream",                                 # XMEye / iCSee / Xiongmai
    "/user={u}&password={p}&channel=1&stream=1.sdp?real_stream",
    "/onvif1", "/live/ch00_0", "/live/ch0", "/ch0_0.h264", "/11", "/12", "/1", "/live", "/h264", "/videoMain", "/axis-media/media.amp", "/",
]


def build(ip, port, user, pw, path):
    path = path.replace("{u}", quote(user, safe="")).replace("{p}", quote(pw, safe=""))
    cred = f"{quote(user, safe='')}:{quote(pw, safe='')}@" if user else ""
    return f"rtsp://{cred}{ip}:{port}{path}"


def works(url):
    cap = cv2.VideoCapture(url)
    try:
        if cap.isOpened():
            for _ in range(5):
                ok, _f = cap.read()
                if ok:
                    return True
    finally:
        cap.release()
    return False


def find_url(ip, port, user, pw):
    print(f"{ip}:{port} uchun RTSP yo'li qidirilmoqda...")
    urls = [build(ip, port, user, pw, p) for p in PATHS]
    with ThreadPoolExecutor(6) as ex:
        for url, ok in zip(urls, ex.map(works, urls)):
            if ok:
                print("Topildi:", url.replace(pw, "***") if pw else url)
                return url
    return None


class Grabber(threading.Thread):
    def __init__(self, source, width):
        super().__init__(daemon=True)
        self.source, self.width = source, width
        self.jpeg, self.ts, self.error = None, 0.0, ""

    def run(self):
        src = int(self.source) if self.source.isdigit() else self.source
        backoff = 2
        while True:
            cap = cv2.VideoCapture(src)
            if not cap.isOpened():
                self.error = "Kameraga ulanib bo'lmadi"
                print(self.error + f", {backoff}s dan so'ng qayta urinaman", file=sys.stderr)
                time.sleep(backoff); backoff = min(30, backoff * 2); continue
            backoff, self.error = 2, ""
            print("Kameraga ulandi.")
            last = 0.0
            while True:
                ok, f = cap.read()
                if not ok:
                    break
                if time.time() - last < 0.15:  # ~6 kadr/s yetarli
                    continue
                last = time.time()
                h, w = f.shape[:2]
                if w > self.width:
                    f = cv2.resize(f, (self.width, int(h * self.width / w)))
                ok, buf = cv2.imencode(".jpg", f, [cv2.IMWRITE_JPEG_QUALITY, 85])
                if ok:
                    self.jpeg, self.ts = buf.tobytes(), time.time()
            cap.release()
            self.error = "Oqim uzildi"
            print("Oqim uzildi, qayta ulanmoqda...", file=sys.stderr)
            time.sleep(2)


def make_handler(g):
    class H(BaseHTTPRequestHandler):
        def _cors(self):
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Private-Network", "true")
            self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "*")
            self.send_header("Cache-Control", "no-store")

        def do_OPTIONS(self):
            self.send_response(204); self._cors(); self.end_headers()

        def do_GET(self):
            path = self.path.split("?")[0]
            if path == "/frame.jpg" and g.jpeg and time.time() - g.ts < 10:
                self.send_response(200); self._cors()
                self.send_header("Content-Type", "image/jpeg"); self.send_header("Content-Length", str(len(g.jpeg)))
                self.end_headers(); self.wfile.write(g.jpeg)
            elif path == "/health":
                body = json.dumps({"ok": bool(g.jpeg) and time.time() - g.ts < 10, "error": g.error}).encode()
                self.send_response(200); self._cors(); self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body))); self.end_headers(); self.wfile.write(body)
            else:
                self.send_response(503); self._cors(); self.end_headers()

        def log_message(self, *a):
            pass
    return H


def main():
    ap = argparse.ArgumentParser(description="IP kamera ko'prigi")
    ap.add_argument("--source", help="to'liq RTSP manzil yoki 0 (USB kamera)")
    ap.add_argument("--ip"); ap.add_argument("--port", type=int, default=554)
    ap.add_argument("--user", default="admin"); ap.add_argument("--password", default="")
    ap.add_argument("--listen", type=int, default=8099, help="shu kompyuterdagi port")
    ap.add_argument("--width", type=int, default=1280)
    a = ap.parse_args()
    src = a.source
    if not src:
        if not a.ip:
            sys.exit("--ip yoki --source kerak. Misol: python ipcam_bridge.py --ip 192.168.1.64 --user admin --password PAROL")
        src = find_url(a.ip, a.port, a.user, a.password)
        if not src:
            sys.exit("RTSP yo'li topilmadi. Tekshiring: 1) kamerada RTSP/ONVIF yoqilgan, 2) login/parol to'g'ri, 3) kompyuter va kamera bir tarmoqda. "
                     "Kamera modelining RTSP manzilini bilsangiz --source bilan bering.")
    g = Grabber(src, a.width); g.start()
    srv = ThreadingHTTPServer(("127.0.0.1", a.listen), make_handler(g))  # faqat shu kompyuter
    print(f"Tayyor. Monitor sahifasida manzil: http://127.0.0.1:{a.listen}   (to'xtatish: Ctrl+C)")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
