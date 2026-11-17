"""Hisobotlar: intervallardan kunlik/davr bo'yicha xulosalar."""
import csv
import io
from datetime import date, datetime, time as dtime, timedelta
from zoneinfo import ZoneInfo

from . import db
from . import settings as settings_mod

KINDS = ("present", "phone_call", "phone_use", "talking")
LIVE_WINDOW = 15  # soniya: shuncha vaqt ichida ko'ringan bo'lsa "hozir" deb hisoblanadi


def tzinfo(name):
    try:
        return ZoneInfo(name)
    except Exception:
        return ZoneInfo("Asia/Tashkent")


def day_bounds(d: date, tz: ZoneInfo):
    s = datetime.combine(d, dtime.min, tz)
    e = datetime.combine(d + timedelta(days=1), dtime.min, tz)
    return s.timestamp(), e.timestamp()


def hms(ts, tz):
    return datetime.fromtimestamp(ts, tz).strftime("%H:%M:%S")


def _clip(rows, s, e):
    out = []
    for r in rows:
        a, b = max(r["start_ts"], s), min(r["end_ts"], e)
        if b > a or (b == a and r["kind"] != "present"):
            out.append((a, b, r))
    return out


def _parse_hm(v):
    h, m = v.split(":")
    return int(h) * 60 + int(m)


def build_day(user_id: int, d: date, now: float | None = None) -> dict:
    st = settings_mod.get(user_id)
    tz = tzinfo(st["tz"])
    s, e = day_bounds(d, tz)
    now = now or datetime.now(tz).timestamp()
    is_today = s <= now < e
    rows = db.q(
        "SELECT * FROM intervals WHERE user_id=? AND end_ts>=? AND start_ts<? ORDER BY start_ts",
        (user_id, s, e),
    )
    emps = {r["id"]: dict(r) for r in db.q("SELECT id,name,position,gender FROM employees WHERE user_id=? AND active=1", (user_id,))}
    groups: dict = {}
    for k in emps:
        groups[("e", k)] = []
    for r in rows:
        key = ("e", r["employee_id"]) if r["employee_id"] else ("u", r["label"] or "Noma'lum shaxs")
        if key[0] == "e" and key[1] not in emps:
            continue
        groups.setdefault(key, []).append(r)

    work_start = _parse_hm(st["work_start"]) * 60
    work_end = _parse_hm(st["work_end"]) * 60
    people = []
    for key, rs in groups.items():
        if key[0] == "e":
            name, position, eid = emps[key[1]]["name"], emps[key[1]]["position"], key[1]
        else:
            name, position, eid = key[1], "", None
        clipped = {k: [] for k in KINDS}
        for a, b, r in _clip(rs, s, e):
            clipped[r["kind"]].append((a, b, r))
        pres = sorted((a, b) for a, b, _ in clipped["present"])
        # present intervallarni (ehtiyot uchun) birlashtiramiz
        merged = []
        for a, b in pres:
            if merged and a <= merged[-1][1] + st["grace_sec"]:  # qisqa uzilishlar (server qayta ishga tushishi) chiqish emas
                merged[-1][1] = max(merged[-1][1], b)
            else:
                merged.append([a, b])
        p = dict(employee_id=eid, name=name, position=position, unknown=eid is None, gender=emps[key[1]]["gender"] if key[0] == "e" else "")
        p["worked_sec"] = int(sum(b - a for a, b in merged))
        p["arrival"] = hms(merged[0][0], tz) if merged else None
        p["arrival_ts"] = merged[0][0] if merged else None
        p["late_min"] = 0
        if merged:
            p["late_min"] = max(0, int((merged[0][0] - s - work_start) // 60))
        live_present = bool(merged) and is_today and now - merged[-1][1] <= LIVE_WINDOW
        p["last_seen"] = hms(merged[-1][1], tz) if merged else None
        p["departure"] = None if (live_present or not merged) else hms(merged[-1][1], tz)

        away = []
        for i in range(1, len(merged)):
            away.append(dict(start=merged[i - 1][1], end=merged[i][0]))
        if is_today and merged and not live_present and now - s < work_end:
            away.append(dict(start=merged[-1][1], end=now, ongoing=True))
            p["departure"] = None
        for a in away:
            a["dur"] = int(a["end"] - a["start"])
            a["start_s"], a["end_s"] = hms(a["start"], tz), hms(a["end"], tz)
            a["from"], a["to"] = a["start"] - s, a["end"] - s
        p["away"] = away
        p["away_sec"] = sum(a["dur"] for a in away)
        p["away_count"] = len(away)

        events = []
        for kind in ("phone_call", "phone_use", "talking"):
            tot = int(sum(b - a for a, b, _ in clipped[kind]))
            p[kind] = dict(sec=tot, count=len(clipped[kind]))
            for a, b, r in clipped[kind]:
                events.append(dict(kind=kind, start=hms(a, tz), end=hms(b, tz), dur=int(b - a), snapshot=r["snapshot"] or "",
                                   from_=a - s, to=b - s, ts=a))
        events.sort(key=lambda x: x["ts"])
        p["events"] = events

        p["timeline"] = {k: [[a - s, b - s] for a, b, _ in clipped[k]] for k in KINDS}
        p["timeline"]["present"] = [[a - s, b - s] for a, b in merged]
        p["timeline"]["away"] = [[a["from"], a["to"]] for a in away]

        # holat (faqat bugun uchun mazmunli)
        if is_today:
            live = set()
            for k in ("phone_call", "phone_use", "talking"):
                if clipped[k] and now - clipped[k][-1][1] <= LIVE_WINDOW:
                    live.add(k)
            if live_present:
                p["status"] = ("phone_call" if "phone_call" in live else "phone_use" if "phone_use" in live
                               else "talking" if "talking" in live else "working")
            else:
                p["status"] = "away" if merged else "absent"
        else:
            p["status"] = "present_day" if merged else "absent"
        p["came"] = bool(merged)
        people.append(p)

    people.sort(key=lambda x: (x["unknown"], not x["came"], x["name"].lower()))
    came = [p for p in people if p["came"] and not p["unknown"]]
    summary = dict(
        total=len([p for p in people if not p["unknown"]]),
        came=len(came),
        absent=len([p for p in people if not p["unknown"]]) - len(came),
        late=len([p for p in came if p["late_min"] > 0]),
        male=len([p for p in came if p["gender"] == "M"]),
        female=len([p for p in came if p["gender"] == "F"]),
        unknown_count=len([p for p in people if p["unknown"] and p["came"]]),
        now_present=len([p for p in came if p["status"] in ("working", "phone_call", "phone_use", "talking")]),
        on_phone=len([p for p in came if p["status"] in ("phone_call", "phone_use")]),
        talking=len([p for p in came if p["status"] == "talking"]),
        phone_sec=sum(p["phone_call"]["sec"] + p["phone_use"]["sec"] for p in came),
        talk_sec=sum(p["talking"]["sec"] for p in came),
        away_sec=sum(p["away_sec"] for p in came),
        worked_sec=sum(p["worked_sec"] for p in came),
    )
    return dict(date=d.isoformat(), is_today=is_today, work_start=st["work_start"], work_end=st["work_end"],
                tz=st["tz"], summary=summary, people=people)


def build_range(user_id: int, start: date, end: date) -> dict:
    days = []
    d = start
    while d <= end and (d - start).days < 92:
        days.append(build_day(user_id, d))
        d += timedelta(days=1)
    agg: dict = {}
    for day in days:
        for p in day["people"]:
            key = p["employee_id"] or p["name"]
            a = agg.setdefault(key, dict(employee_id=p["employee_id"], name=p["name"], position=p["position"], unknown=p["unknown"],
                                         days_came=0, late_days=0, late_min=0, worked_sec=0, away_sec=0, away_count=0,
                                         phone_call_sec=0, phone_call_count=0, phone_use_sec=0, phone_use_count=0,
                                         talking_sec=0, talking_count=0))
            if p["came"]:
                a["days_came"] += 1
                a["late_days"] += 1 if p["late_min"] > 0 else 0
                a["late_min"] += p["late_min"]
            a["worked_sec"] += p["worked_sec"]
            a["away_sec"] += p["away_sec"]
            a["away_count"] += p["away_count"]
            for k in ("phone_call", "phone_use", "talking"):
                a[k + "_sec"] += p[k]["sec"]
                a[k + "_count"] += p[k]["count"]
    per_day = [dict(date=x["date"], came=x["summary"]["came"], late=x["summary"]["late"],
                    phone_sec=x["summary"]["phone_sec"], talk_sec=x["summary"]["talk_sec"],
                    away_sec=x["summary"]["away_sec"], worked_sec=x["summary"]["worked_sec"]) for x in days]
    return dict(start=start.isoformat(), end=end.isoformat(), people=sorted(agg.values(), key=lambda x: x["name"].lower()), days=per_day)


def fmt_dur(sec):
    sec = int(sec)
    h, m, s = sec // 3600, sec % 3600 // 60, sec % 60
    return f"{h:02d}:{m:02d}:{s:02d}"


def to_csv(user_id: int, start: date, end: date) -> str:
    out = io.StringIO()
    out.write("﻿")  # Excel UTF-8 uchun
    w = csv.writer(out, delimiter=";")
    w.writerow(["Sana", "Xodim", "Lavozim", "Kelgan vaqti", "Kechikish (daq)", "Ketgan vaqti", "Ishxonada (s:d:s)",
                "Tashqarida (s:d:s)", "Chiqishlar soni", "Telefonda gaplashgan (s:d:s)", "Qo'ng'iroqlar soni",
                "Telefon ishlatgan (s:d:s)", "Telefon holatlari soni", "Gaplashgan (s:d:s)", "Gaplashuvlar soni"])
    d = start
    while d <= end and (d - start).days < 92:
        day = build_day(user_id, d)
        for p in day["people"]:
            if not p["came"]:
                continue
            w.writerow([day["date"], p["name"], p["position"], p["arrival"], p["late_min"], p["departure"] or "",
                        fmt_dur(p["worked_sec"]), fmt_dur(p["away_sec"]), p["away_count"],
                        fmt_dur(p["phone_call"]["sec"]), p["phone_call"]["count"],
                        fmt_dur(p["phone_use"]["sec"]), p["phone_use"]["count"],
                        fmt_dur(p["talking"]["sec"]), p["talking"]["count"]])
        d += timedelta(days=1)
    return out.getvalue()


def recent_events(user_id: int, limit=30):
    st = settings_mod.get(user_id)
    tz = tzinfo(st["tz"])
    rows = db.q(
        """SELECT i.*, e.name AS ename FROM intervals i LEFT JOIN employees e ON e.id=i.employee_id
           WHERE i.user_id=? AND i.kind!='present' ORDER BY i.start_ts DESC LIMIT ?""",
        (user_id, limit),
    )
    return [dict(id=r["id"], kind=r["kind"], name=r["ename"] or r["label"] or "Noma'lum", time=hms(r["start_ts"], tz),
                 date=datetime.fromtimestamp(r["start_ts"], tz).strftime("%d.%m"), dur=int(r["end_ts"] - r["start_ts"]),
                 snapshot=r["snapshot"] or "") for r in rows]
