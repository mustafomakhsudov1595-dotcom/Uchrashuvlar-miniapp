"""Model fayllarini birinchi ishga tushirishda avtomatik yuklab olish."""
import urllib.request
from pathlib import Path

from ..config import MODELS


def ensure(url: str, name: str) -> Path:
    p = MODELS / name
    if p.exists() and p.stat().st_size > 10_000:
        return p
    tmp = p.with_suffix(p.suffix + ".part")
    with urllib.request.urlopen(url, timeout=120) as r, open(tmp, "wb") as f:
        while chunk := r.read(1 << 16):
            f.write(chunk)
    tmp.rename(p)
    return p
