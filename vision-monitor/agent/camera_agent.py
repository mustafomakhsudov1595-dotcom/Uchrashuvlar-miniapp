#!/usr/bin/env python3
"""VisionMonitor — ofis agenti.

Sayt internetda (bulutda) bo'lsa, u ofisingizdagi kameraga to'g'ridan-to'g'ri ulana olmaydi.
Bu agent ofisdagi kompyuterda ishlaydi: kameradan (RTSP) kadr oladi va saytga HTTPS orqali yuboradi.
Faqat chiquvchi ulanish kerak — routerda port ochish (port forwarding) shart emas.

Ishga tushirish:
    pip install opencv-python-headless
    python camera_agent.py --server https://SAYT-MANZILI --camera 3 --key KAMERA_KALITI --source "rtsp://admin:parol@192.168.1.64:554/Streaming/Channels/101"
(--camera va --key kabinetda "Agent" usuli bilan kamera qo'shganda ko'rsatiladi)
"""
import argparse
import sys
import time
import urllib.error
import urllib.request

import cv2


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--server", required=True)
    ap.add_argument("--camera", required=True, type=int)
    ap.add_argument("--key", required=True)
    ap.add_argument("--source", required=True, help="rtsp://... yoki 0 (USB kamera)")
    ap.add_argument("--fps", type=float, default=4.0, help="sekundiga yuboriladigan kadrlar (3-5 yetarli)")
    ap.add_argument("--width", type=int, default=1280, help="yuborishdan oldin kadr kengligi")
    ap.add_argument("--quality", type=int, default=80)
    a = ap.parse_args()

    url = f"{a.server.rstrip('/')}/api/ingest/{a.camera}"
    src = int(a.source) if a.source.isdigit() else a.source
    period = 1.0 / a.fps
    backoff, sent, t0 = 2, 0, time.time()
    while True:
        cap = cv2.VideoCapture(src)
        if not cap.isOpened():
            print(f"Kameraga ulanib bo'lmadi, {backoff}s dan so'ng qayta urinaman...", file=sys.stderr)
            time.sleep(backoff)
            backoff = min(30, backoff * 2)
            continue
        backoff = 2
        print("Kameraga ulandi. Kadrlar yuborilmoqda...")
        last = 0.0
        while True:
            ok = cap.grab()  # buferni bo'shatish uchun doim o'qiymiz
            if not ok:
                break
            now = time.time()
            if now - last < period:
                continue
            ok, frame = cap.retrieve()
            if not ok:
                break
            last = now
            h, w = frame.shape[:2]
            if w > a.width:
                frame = cv2.resize(frame, (a.width, int(h * a.width / w)))
            ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, a.quality])
            req = urllib.request.Request(url, data=buf.tobytes(), headers={"X-Camera-Key": a.key, "Content-Type": "image/jpeg"}, method="POST")
            try:
                urllib.request.urlopen(req, timeout=10).read()
                sent += 1
            except urllib.error.HTTPError as e:
                if e.code in (403, 409):
                    sys.exit(f"Server rad etdi ({e.code}): kamera raqami/kaliti noto'g'ri yoki kamera o'chirilgan.")
                print("Server xatosi:", e.code, file=sys.stderr)
                time.sleep(2)
            except Exception as e:  # tarmoq uzilishi — davom etamiz
                print("Yuborib bo'lmadi:", e, file=sys.stderr)
                time.sleep(2)
            if time.time() - t0 > 30:
                print(f"{sent / (time.time() - t0):.1f} kadr/s yuborilmoqda")
                sent, t0 = 0, time.time()
        cap.release()
        print("Oqim uzildi, qayta ulanmoqda...", file=sys.stderr)
        time.sleep(2)


if __name__ == "__main__":
    main()
