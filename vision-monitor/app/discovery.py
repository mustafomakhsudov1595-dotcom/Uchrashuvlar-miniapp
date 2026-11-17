"""Kamerani tarmoqdan topish va avtomatik ulash.

 - ONVIF WS-Discovery (multicast): ONVIF qo'llaydigan kameralarni topadi
 - Port skaneri: o'z tarmog'ingizdagi (/24) RTSP portlari ochiq qurilmalar
 - RTSP DESCRIBE bilan marka yo'llarini sinash (404 = yo'l yo'q, 401/200 = yo'l bor) va cv2 bilan haqiqiy kadr olish
"""
import ipaddress
import re
import socket
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import quote, urlparse

import cv2

BRAND_PATHS = {
    "hikvision": ["/Streaming/Channels/101", "/Streaming/Channels/102", "/h264/ch1/main/av_stream", "/ISAPI/Streaming/channels/101"],
    "dahua": ["/cam/realmonitor?channel=1&subtype=0", "/cam/realmonitor?channel=1&subtype=1"],
    "tapo": ["/stream1", "/stream2"],
    "reolink": ["/h264Preview_01_main", "/h264Preview_01_sub", "/Preview_01_main"],
    "uniview": ["/media/video1", "/media/video2"],
    "axis": ["/axis-media/media.amp", "/axis-media/media.amp?videocodec=h264"],
    "ezviz": ["/h264/ch1/main/av_stream", "/h264/ch1/sub/av_stream"],
    "foscam": ["/videoMain", "/videoSub", "/11", "/12"],
    "xiaomi": ["/live/ch00_0", "/live/ch0"],
    "generic": ["/", "/live", "/stream1", "/stream", "/1", "/ch0_0.h264", "/h264", "/live/ch0", "/live.sdp", "/onvif1", "/11", "/av0_0", "/cam1/h264", "/h264_stream"],
}
BRAND_LABELS = {"auto": "Bilmayman (hammasini sinash)", "hikvision": "Hikvision", "dahua": "Dahua / Imou / Amcrest", "tapo": "TP-Link Tapo / VIGI",
                "reolink": "Reolink", "uniview": "Uniview (UNV)", "axis": "Axis", "ezviz": "EZVIZ", "foscam": "Foscam", "xiaomi": "Xiaomi / Yi / boshqa", "generic": "Boshqa / noma'lum"}
PORT_HINTS = {8000: "hikvision", 37777: "dahua"}


def host_allowed(host: str) -> bool:
    """Server ichki xizmatlariga (localhost, bulut metadata) murojaat qilinishini bloklaydi."""
    try:
        infos = socket.getaddrinfo(host, None)
    except OSError:
        return False
    for i in infos:
        ip = ipaddress.ip_address(i[4][0])
        if ip.is_loopback or ip.is_link_local or ip.is_unspecified or ip.is_multicast or ip.is_reserved:
            return False
    return True


def source_host(src: str):
    try:
        return urlparse(src).hostname
    except Exception:
        return None


# ------------------------------------------------------------------ discovery
def local_subnets():
    nets = set()
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1))  # paket yuborilmaydi, faqat chiquvchi interfeys aniqlanadi
        ip = s.getsockname()[0]
        s.close()
        a = ipaddress.ip_address(ip)
        if a.is_private and not a.is_loopback:
            nets.add(ipaddress.ip_network(ip + "/24", strict=False))
    except OSError:
        pass
    return list(nets)


def _port_open(ip, port, timeout=0.4):
    try:
        with socket.create_connection((str(ip), port), timeout=timeout):
            return True
    except OSError:
        return False


def scan_network():
    nets = local_subnets()
    if not nets:
        return dict(subnets=[], devices=[], note="Server o'z tarmog'ini aniqlay olmadi (bulutda ishlayotgan bo'lishi mumkin). Ofisdagi Agentdan foydalaning.")
    ports = [554, 8554, 8000, 37777]
    hosts = [h for n in nets for h in n.hosts()]
    found: dict[str, dict] = {}
    lock = threading.Lock()

    def probe(ip):
        op = [p for p in ports if _port_open(ip, p)]
        if op and (554 in op or 8554 in op or 8000 in op or 37777 in op):
            hint = next((PORT_HINTS[p] for p in op if p in PORT_HINTS), "")
            with lock:
                found[str(ip)] = dict(ip=str(ip), ports=op, brand=hint, onvif=False, name="")

    with ThreadPoolExecutor(64) as ex:
        list(ex.map(probe, hosts))
    for d in onvif_discover():
        e = found.setdefault(d["ip"], dict(ip=d["ip"], ports=[], brand="", onvif=True, name=""))
        e["onvif"], e["name"] = True, d.get("name", "")
        if d.get("brand") and not e["brand"]:
            e["brand"] = d["brand"]
    return dict(subnets=[str(n) for n in nets], devices=sorted(found.values(), key=lambda x: ipaddress.ip_address(x["ip"])), note="")


def onvif_discover(timeout=2.5):
    msg = ('<?xml version="1.0" encoding="UTF-8"?><e:Envelope xmlns:e="http://www.w3.org/2003/05/soap-envelope" '
           'xmlns:w="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery" '
           'xmlns:dn="http://www.onvif.org/ver10/network/wsdl"><e:Header><w:MessageID>uuid:%s</w:MessageID>'
           '<w:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</w:To><w:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action></e:Header>'
           '<e:Body><d:Probe><d:Types>dn:NetworkVideoTransmitter</d:Types></d:Probe></e:Body></e:Envelope>') % uuid.uuid4()
    out = {}
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.sendto(msg.encode(), ("239.255.255.250", 3702))
        end = time.time() + timeout
        while time.time() < end:
            try:
                data, addr = s.recvfrom(65535)
            except socket.timeout:
                continue
            except OSError:
                break
            txt = data.decode("utf-8", "ignore")
            m = re.search(r"onvif://www\.onvif\.org/name/([^\s<]+)", txt)
            hw = re.search(r"onvif://www\.onvif\.org/hardware/([^\s<]+)", txt)
            name = (m.group(1) if m else "") + (" " + hw.group(1) if hw else "")
            brand = next((b for b in BRAND_PATHS if b in name.lower()), "")
            out[addr[0]] = dict(ip=addr[0], name=name.replace("%20", " ").strip(), brand=brand)
        s.close()
    except OSError:
        pass
    return list(out.values())


# ------------------------------------------------------------------ autoconnect
def rtsp_describe(host, port, path, timeout=2.0):
    """RTSP DESCRIBE -> holat kodi (200 / 401 / 404 ...) yoki None (ulanmadi)."""
    try:
        with socket.create_connection((host, port), timeout=timeout) as s:
            s.settimeout(timeout)
            req = f"DESCRIBE rtsp://{host}:{port}{path} RTSP/1.0\r\nCSeq: 1\r\nAccept: application/sdp\r\nUser-Agent: VisionMonitor\r\n\r\n"
            s.sendall(req.encode())
            data = s.recv(512).decode("latin1", "ignore")
        m = re.match(r"RTSP/1\.0 (\d{3})", data)
        return int(m.group(1)) if m else None
    except OSError:
        return None


def grab_frame(url, timeout_note=""):
    cap = cv2.VideoCapture(url)
    try:
        if not cap.isOpened():
            return None
        for _ in range(6):
            ok, f = cap.read()
            if ok:
                return f
    finally:
        cap.release()
    return None


def build_url(host, port, path, user, pw):
    cred = f"{quote(user, safe='')}:{quote(pw, safe='')}@" if user else ""
    return f"rtsp://{cred}{host}:{port}{path}"


def autoconnect(host, port=554, user="", pw="", brand="auto"):
    """Qaytaradi dict(ok, url, message, tried)."""
    if not host_allowed(host):
        return dict(ok=False, message="Bu manzilga ulanishga ruxsat yo'q", url="")
    if not _port_open(host, port, 2.0):
        return dict(ok=False, url="", message=f"{host}:{port} ochilmadi. IP manzil, port va kamera/server bir tarmoqda ekanini tekshiring "
                                              "(sayt internetda bo'lsa, ofisdagi Agent usulidan foydalaning).")
    brands = [brand] if brand in BRAND_PATHS and brand != "generic" else []
    order = brands + [b for b in BRAND_PATHS if b not in brands and b != "generic"] + ["generic"]
    if brand == "generic":
        order = ["generic"] + [b for b in order if b != "generic"]
    paths = []
    for b in order:
        for p in BRAND_PATHS[b]:
            if p not in paths:
                paths.append(p)
    # 1) tezkor: qaysi yo'llar mavjud (404 emas)?
    with ThreadPoolExecutor(8) as ex:
        codes = list(ex.map(lambda p: rtsp_describe(host, port, p), paths))
    existing = [(p, c) for p, c in zip(paths, codes) if c in (200, 401, 403)]
    if not existing:
        return dict(ok=False, url="", message="Kamera RTSP ga javob beryapti, lekin hech bir standart yo'l topilmadi. Kamera modelining RTSP manzilini "
                                              "qo'lda kiriting yoki kamera sozlamasida RTSP yoqilganini tekshiring.")
    # 2) login/parol bilan haqiqiy kadr olish
    tried = []

    def attempt(pc):
        url = build_url(host, port, pc[0], user, pw)
        f = grab_frame(url)
        return pc[0], url, f is not None

    with ThreadPoolExecutor(4) as ex:
        for p, url, ok in ex.map(attempt, existing[:8]):
            tried.append(p)
            if ok:
                return dict(ok=True, url=url, path=p, message=f"Ulandi! Yo'l: {p}", tried=tried)
    needs_auth = any(c == 401 for _, c in existing)
    return dict(ok=False, url="", tried=tried,
                message=("Kamera login/parol so'rayapti, lekin berilgan login yoki parol noto'g'ri (kamera sozlamasida RTSP/ONVIF foydalanuvchisi yaratilganini ham tekshiring)."
                         if needs_auth else "Yo'l topildi, lekin tasvir kelmadi. Kamera boshqa kodek (H.265) yoki juda ko'p ulanish ishlatayotgan bo'lishi mumkin."))
