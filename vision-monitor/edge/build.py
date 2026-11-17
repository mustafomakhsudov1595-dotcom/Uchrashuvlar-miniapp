"""Edge (Cloudflare Worker) to'plamini yig'adi: dist/worker.js + dist/wrangler.toml
Ishlatish: python edge/build.py
"""
import base64
import json
import mimetypes
from pathlib import Path

here = Path(__file__).resolve().parent
web = here.parent / "web"
dist = here / "dist"
dist.mkdir(exist_ok=True)

files = {}
SKIP = {"camera.html"}  # Python server uchun; edge da monitor.html ishlatiladi
for f in list(web.glob("*")) + [here / "monitor.html", here / "monitor.js", here / "edge.js", here.parent / "agent" / "ipcam_bridge.py"]:
    if f.name in SKIP or not f.is_file():
        continue
    data = f.read_bytes()
    if f.name == "index.html":
        data = data.decode().replace('<script src="app.js">', '<script src="edge.js"></script>\n<script src="app.js">').encode()
    ct = mimetypes.guess_type(f.name)[0] or "application/octet-stream"
    if f.suffix == ".py":
        ct = "text/x-python; charset=utf-8"
    if f.suffix == ".webmanifest":
        ct = "application/manifest+json"
    if f.suffix in (".html", ".js", ".css", ".json", ".webmanifest", ".svg"):
        ct += "; charset=utf-8"
    files["/" + f.name] = [ct, base64.b64encode(data).decode()]

for f in (here / "vendor").glob("*"):
    ct = "application/wasm" if f.suffix == ".wasm" else "text/javascript; charset=utf-8"
    files["/vendor/" + f.name] = [ct, base64.b64encode(f.read_bytes()).decode()]

src = (here / "worker_src.js").read_text()
# import qatori eng tepada bo'lishi uchun ASSETS ni undan keyin qo'yamiz
first, rest = src.split("\n", 2)[0:2], src.split("\n", 2)[2]
out = "\n".join(first) + "\n" + src.split("\n", 2)[1]  # (qoldirilgan sarlavha)
imp = 'import { DurableObject } from "cloudflare:workers";'
body = src.replace(imp, "")
(dist / "worker.js").write_text(imp + "\nconst ASSETS = " + json.dumps(files) + ";\n" + body)
(dist / "wrangler.toml").write_text('''name = "visionmonitor"
main = "worker.js"
compatibility_date = "2025-01-01"
[[durable_objects.bindings]]
name = "DB"
class_name = "DB"
[[migrations]]
tag = "v1"
new_sqlite_classes = ["DB"]
''')
print("tayyor:", dist / "worker.js", f"{(dist / 'worker.js').stat().st_size // 1024} KB", len(files), "fayl")
