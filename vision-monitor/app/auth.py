import hashlib
import hmac
import os
import time
from collections import defaultdict, deque

import jwt
from fastapi import HTTPException, Request

from . import db
from .config import SECRET, TOKEN_HOURS


def hash_pw(pw: str) -> str:
    salt = os.urandom(16)
    h = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, 200_000)
    return salt.hex() + "$" + h.hex()


def check_pw(pw: str, stored: str) -> bool:
    try:
        salt_hex, h_hex = stored.split("$")
        h = hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt_hex), 200_000)
        return hmac.compare_digest(h.hex(), h_hex)
    except Exception:
        return False


def make_token(uid: int) -> str:
    return jwt.encode({"uid": uid, "exp": int(time.time()) + TOKEN_HOURS * 3600}, SECRET, algorithm="HS256")


def user_from_token(token: str):
    try:
        uid = jwt.decode(token, SECRET, algorithms=["HS256"])["uid"]
    except Exception:
        return None
    return db.one("SELECT id,email,name,company FROM users WHERE id=?", (uid,))


def current_user(request: Request):
    tok = ""
    h = request.headers.get("authorization", "")
    if h.lower().startswith("bearer "):
        tok = h[7:]
    elif request.query_params.get("token"):  # <img src> oqimlari uchun
        tok = request.query_params["token"]
    u = user_from_token(tok) if tok else None
    if not u:
        raise HTTPException(401, "Tizimga qayta kiring")
    return dict(u)


# Parolni taxmin qilishdan himoya: 10 daqiqada 8 ta xato urinish
_fails: dict[str, deque] = defaultdict(deque)


def throttle_check(key: str):
    d = _fails[key]
    now = time.time()
    while d and now - d[0] > 600:
        d.popleft()
    if len(d) >= 8:
        raise HTTPException(429, "Juda ko'p xato urinish. 10 daqiqadan so'ng qayta urinib ko'ring")


def throttle_fail(key: str):
    _fails[key].append(time.time())


def throttle_ok(key: str):
    _fails.pop(key, None)
