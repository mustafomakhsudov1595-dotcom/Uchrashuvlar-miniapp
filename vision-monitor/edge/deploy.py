"""Cloudflare ga deploy: python edge/deploy.py <ACCOUNT_ID> [ISM]
API token muhitda (yoki proksi orqali) bo'lishi kerak. Durable Object (SQLite) migratsiyasi bilan."""
import json, subprocess, sys, urllib.request, uuid
from pathlib import Path

acc = sys.argv[1]; name = sys.argv[2] if len(sys.argv) > 2 else "visionmonitor"
api = "https://api.cloudflare.com/client/v4"
src = (Path(__file__).parent / "dist" / "worker.js").read_bytes()
meta = {"main_module": "worker.js", "compatibility_date": "2025-01-01",
        "bindings": [{"type": "durable_object_namespace", "name": "DB", "class_name": "DB"}],
        "migrations": {"new_tag": "v1", "new_sqlite_classes": ["DB"]}}
def payload(with_migration):
    m = dict(meta)
    if not with_migration:
        m.pop("migrations")
    b = uuid.uuid4().hex
    body = (f'--{b}\r\nContent-Disposition: form-data; name="metadata"\r\nContent-Type: application/json\r\n\r\n{json.dumps(m)}\r\n'
            f'--{b}\r\nContent-Disposition: form-data; name="worker.js"; filename="worker.js"\r\nContent-Type: application/javascript+module\r\n\r\n').encode() + src + f"\r\n--{b}--\r\n".encode()
    return body, f"multipart/form-data; boundary={b}"
def call(url, data=None, method="GET", ct="application/json"):
    req = urllib.request.Request(url, data=data, method=method, headers={"content-type": ct})
    try:
        with urllib.request.urlopen(req, timeout=120) as r: return json.loads(r.read())
    except urllib.error.HTTPError as e: return json.loads(e.read() or b"{}")
body, ct = payload(True)
r = call(f"{api}/accounts/{acc}/workers/scripts/{name}", body, "PUT", ct)
if not r.get("success") and any(e.get("code") == 10079 for e in r.get("errors", [])):  # migratsiya allaqachon qo'llangan
    body, ct = payload(False)
    r = call(f"{api}/accounts/{acc}/workers/scripts/{name}", body, "PUT", ct)
print("script:", r.get("success"), r.get("errors"))
if not r.get("success"): sys.exit(1)
r = call(f"{api}/accounts/{acc}/workers/scripts/{name}/subdomain", json.dumps({"enabled": True, "previews_enabled": False}).encode(), "POST")
print("subdomain:", r.get("success"), r.get("errors"))
sub = call(f"{api}/accounts/{acc}/workers/subdomain")["result"]["subdomain"]
print(f"LINK: https://{name}.{sub}.workers.dev")
