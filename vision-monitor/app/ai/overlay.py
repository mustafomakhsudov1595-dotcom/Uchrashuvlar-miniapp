import unicodedata

import cv2

COLORS = {"ok": (80, 200, 120), "phone_call": (60, 60, 230), "phone_use": (40, 150, 240), "talking": (230, 160, 40), "unk": (170, 170, 170)}
LABELS = {"phone_call": "TELEFONDA GAPLASHMOQDA", "phone_use": "TELEFON ISHLATMOQDA", "talking": "GAPLASHMOQDA"}


def ascii_text(s: str) -> str:
    s = s.replace("ʻ", "'").replace("ʼ", "'").replace("’", "'")
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode() or "?"


def draw(frame, items, phones, status=""):
    for p in phones:
        cv2.rectangle(frame, tuple(int(v) for v in p[:2]), tuple(int(v) for v in p[2:4]), (255, 0, 255), 2)
    for it in items:
        x1, y1, x2, y2 = [int(v) for v in it["box"]]
        st = it["state"]
        key = "phone_call" if "phone_call" in st else "phone_use" if "phone_use" in st else "talking" if "talking" in st else ("ok" if it.get("name") else "unk")
        col = COLORS[key]
        cv2.rectangle(frame, (x1, y1), (x2, y2), col, 2)
        g = {"M": "Erkak", "F": "Ayol"}.get(it.get("gender"), "")
        if it.get("name"):
            name = ascii_text(it["name"]) + (f" ({g})" if g else "")
        else:
            name = f"Nomalum {g} {it.get('age') or ''}y".replace("  ", " ") if g else f"Nomalum #{it['track']}"
        lines = [name] + ([LABELS[key]] if key in LABELS else [])
        y = max(18, y1 - 6 - 20 * (len(lines) - 1))
        for ln in lines:
            (tw, th), _ = cv2.getTextSize(ln, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)
            cv2.rectangle(frame, (x1, y - th - 6), (x1 + tw + 8, y + 4), col, -1)
            cv2.putText(frame, ln, (x1 + 4, y), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1, cv2.LINE_AA)
            y += 20
    if status:
        cv2.putText(frame, status, (10, frame.shape[0] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)
    return frame
