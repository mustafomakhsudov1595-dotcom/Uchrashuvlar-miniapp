#!/usr/bin/env python3
"""VisionMonitor — IP kamera ko'prigi (ofis/ko'cha kameralari uchun).

Kameraning RTSP oqimini o'qiydi va shu kompyuterning ichida (127.0.0.1) oddiy kadr sifatida beradi.
VisionMonitor monitor sahifasi (Chrome/Edge) shu kadrlarni o'qib, AI tahlilini bajaradi.
Hech qanday port internetga ochilmaydi: faqat shu kompyuterning o'zi ko'ra oladi.

Kerak: Python 3.9+, `pip install opencv-python-headless`
Eng oson usul (kamerani tarmoqdan o'zi topadi, faqat parol so'raydi):
    python ipcam_bridge.py
Ishga tushirish (kamera IP manzili bilan — yo'lni o'zi topadi):
    python ipcam_bridge.py --ip 192.168.1.64 --user admin --password PAROL
Yoki aniq manzil bilan:
    python ipcam_bridge.py --source "rtsp://admin:PAROL@192.168.1.64:554/Streaming/Channels/101"
"""
import argparse
import getpass
import ipaddress
import json
import os
import re
import socket
import sys
import threading
import time
import uuid
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


# ------------------------------------------------------------------ tarmoqdan kamera qidirish
def local_subnets():
    nets = set()
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1))  # paket yuborilmaydi: faqat chiquvchi interfeys aniqlanadi
        ip = s.getsockname()[0]; s.close()
        if ipaddress.ip_address(ip).is_private:
            nets.add(ipaddress.ip_network(ip + "/24", strict=False))
    except OSError:
        pass
    return list(nets)


def port_open(ip, port, timeout=0.35):
    try:
        with socket.create_connection((str(ip), port), timeout=timeout):
            return True
    except OSError:
        return False


def onvif_discover(timeout=2.5):
    msg = ('<?xml version="1.0" encoding="UTF-8"?><e:Envelope xmlns:e="http://www.w3.org/2003/05/soap-envelope" '
           'xmlns:w="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery" '
           'xmlns:dn="http://www.onvif.org/ver10/network/wsdl"><e:Header><w:MessageID>uuid:%s</w:MessageID>'
           '<w:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</w:To><w:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action></e:Header>'
           '<e:Body><d:Probe><d:Types>dn:NetworkVideoTransmitter</d:Types></d:Probe></e:Body></e:Envelope>') % uuid.uuid4()
    out = {}
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.settimeout(0.5)
        s.sendto(msg.encode(), ("239.255.255.250", 3702))
        end = time.time() + timeout
        while time.time() < end:
            try:
                data, addr = s.recvfrom(65535)
            except socket.timeout:
                continue
            m = re.search(r"onvif://www\.onvif\.org/name/([^\s<]+)", data.decode("utf-8", "ignore"))
            out[addr[0]] = (m.group(1) if m else "").replace("%20", " ")
        s.close()
    except OSError:
        pass
    return out


def scan(subnet=None):
    nets = [ipaddress.ip_network(subnet, strict=False)] if subnet else local_subnets()
    if not nets:
        print("Tarmoq aniqlanmadi. IP manzilni qo'lda kiriting: --ip ...")
        return []
    print("Qidirilmoqda:", ", ".join(map(str, nets)), "(10–20 soniya)...")
    found = {}
    lock = threading.Lock()
    ports = [554, 8554, 8000, 37777, 34567]

    def probe(ip):
        op = [p for p in ports if port_open(ip, p)]
        if op:
            with lock:
                found[str(ip)] = {"ports": op, "name": ""}

    hosts = [h for n in nets for h in n.hosts()]
    with ThreadPoolExecutor(96) as ex:
        list(ex.map(probe, hosts))
    for ip, name in onvif_discover().items():
        found.setdefault(ip, {"ports": [], "name": ""})["name"] = name or "ONVIF"
    rows = sorted(found.items(), key=lambda kv: ipaddress.ip_address(kv[0]))
    return [(ip, v) for ip, v in rows]


def wizard(subnet=None):
    rows = scan(subnet)
    if not rows:
        print("Kamera topilmadi. Tekshiring: kamera yoqilgan, shu Wi-Fi/tarmoqda, kamera sozlamasida RTSP/ONVIF yoqilgan.")
        return None
    print("\nTopilgan qurilmalar:")
    for i, (ip, v) in enumerate(rows, 1):
        print(f"  {i}) {ip}   portlar: {','.join(map(str, v['ports'])) or '-'}   {v['name']}")
    if not sys.stdin.isatty():
        return None
    k = input("Qaysi biri kamera? Raqamini kiriting: ").strip()
    ip = rows[int(k) - 1][0] if k.isdigit() and 1 <= int(k) <= len(rows) else k
    user = input("Login [admin]: ").strip() or "admin"
    pw = getpass.getpass("Parol (kamera ilovasida RTSP/ONVIF uchun o'rnatilgan; kiritganingiz ko'rinmaydi): ")
    return find_url(ip, 554, user, pw)


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
    ap.add_argument("--scan", action="store_true", help="tarmoqdagi kameralarni qidirish va ro'yxatini chiqarish")
    ap.add_argument("--subnet", help="qidiriladigan tarmoq, masalan 192.168.1.0/24")
    ap.add_argument("--ip"); ap.add_argument("--port", type=int, default=554)
    ap.add_argument("--user", default="admin"); ap.add_argument("--password", default="")
    ap.add_argument("--listen", type=int, default=8099, help="shu kompyuterdagi port")
    ap.add_argument("--width", type=int, default=1280)
    a = ap.parse_args()
    src = a.source
    if a.scan:
        for ip, v in scan(a.subnet):
            print(f"{ip}\tportlar: {','.join(map(str, v['ports'])) or '-'}\t{v['name']}")
        return
    if not src:
        if not a.ip:
            src = wizard(a.subnet)
            if not src:
                sys.exit("Ulanmadi. Yoki: python ipcam_bridge.py --ip 192.168.1.64 --user admin --password PAROL")
        else:
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
