"""Demo ma'lumot: xodimlar va oxirgi 7 kunlik realistik tarix (tizimni sinab ko'rish uchun)."""
import random
import time
from datetime import datetime, timedelta

from . import db
from . import settings as settings_mod
from .reports import day_bounds, tzinfo

NAMES = [("Aziz Karimov", "Menejer", "M"), ("Malika Yusupova", "Buxgalter", "F"), ("Jasur Toshmatov", "Dasturchi", "M"),
         ("Dilnoza Rahimova", "Dizayner", "F"), ("Sardor Ismoilov", "Sotuv bo'limi", "M"), ("Nigora Abdullayeva", "Operator", "F")]


def seed(user_id: int, days: int = 7):
    st = settings_mod.get(user_id)
    tz = tzinfo(st["tz"])
    emp_ids = []
    for n, pos, g in NAMES:
        r = db.one("SELECT id FROM employees WHERE user_id=? AND name=?", (user_id, n))
        emp_ids.append(r["id"] if r else db.run(
            "INSERT INTO employees(user_id,name,position,gender,created_at) VALUES(?,?,?,?,?)", (user_id, n, pos, g, time.time())))
    if not db.one("SELECT id FROM cameras WHERE user_id=? AND source='demo'", (user_id,)):
        db.run("INSERT INTO cameras(user_id,name,source,role,enabled,created_at) VALUES(?,?,?,?,1,?)",
               (user_id, "Demo kamera (sun'iy)", "demo", "office", time.time()))
    cam = db.one("SELECT id FROM cameras WHERE user_id=? ORDER BY id LIMIT 1", (user_id,))["id"]
    now = time.time()
    today = datetime.now(tz).date()
    ws_h, ws_m = [int(x) for x in st["work_start"].split(":")]
    with db.tx():
        db.run("DELETE FROM intervals WHERE user_id=? AND snapshot='' AND start_ts<?", (user_id, now - 60))
        for back in range(days, -1, -1):
            d = today - timedelta(days=back)
            if d.weekday() == 6:  # yakshanba dam olish
                continue
            s0, _ = day_bounds(d, tz)
            for ei, eid in enumerate(emp_ids):
                rnd = random.Random(f"{user_id}-{d}-{eid}")
                if rnd.random() < 0.07 and back > 0:
                    continue  # kelmagan
                late = rnd.choice([-25, -15, -8, -3, 0, 4, 12, 25, 40]) if ei != 2 else rnd.choice([5, 18, 33])
                arrive = s0 + (ws_h * 60 + ws_m + late) * 60 + rnd.randint(0, 59)
                leave = s0 + (18 * 60 + rnd.randint(-20, 35)) * 60
                end = min(leave, now) if back == 0 else leave
                if end <= arrive:
                    continue
                outs = [(s0 + 13 * 3600 + rnd.randint(0, 1800), rnd.randint(35, 65) * 60)]
                for _ in range(rnd.randint(1, 3)):
                    outs.append((arrive + rnd.randint(1, 7) * 3600 + rnd.randint(0, 3000), rnd.randint(4, 22) * 60))
                outs = sorted((a, a + dur) for a, dur in outs if arrive + 600 < a < end - 600)
                segs, cur = [], arrive
                for a, b in outs:
                    if a < cur + 300:
                        continue
                    segs.append((cur, a))
                    cur = b
                if cur < end:
                    segs.append((cur, end))
                for a, b in segs:
                    if b > a:
                        db.run("INSERT INTO intervals(user_id,employee_id,camera_id,kind,start_ts,end_ts) VALUES(?,?,?,?,?,?)",
                               (user_id, eid, cam, "present", a, b))
                heavy = 1.8 if ei in (1, 4) else 1.0
                for kind, (n_lo, n_hi), (d_lo, d_hi) in (("phone_call", (2, 7), (25, 280)), ("phone_use", (3, 10), (30, 420)),
                                                         ("talking", (5, 14), (20, 240))):
                    for _ in range(int(rnd.randint(n_lo, n_hi) * heavy)):
                        a, b = rnd.choice(segs) if segs else (arrive, end)
                        if b - a < 700:
                            continue
                        st_ = a + rnd.randint(0, int(b - a - 600))
                        dur = rnd.randint(d_lo, d_hi)
                        if st_ + dur > now:
                            continue
                        db.run("INSERT INTO intervals(user_id,employee_id,camera_id,kind,start_ts,end_ts) VALUES(?,?,?,?,?,?)",
                               (user_id, eid, cam, kind, st_, st_ + dur))
    return len(emp_ids)
