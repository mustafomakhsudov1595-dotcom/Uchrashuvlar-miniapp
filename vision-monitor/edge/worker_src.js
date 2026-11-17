// VisionMonitor — Cloudflare Worker (backend). Ma'lumotlar Durable Object ichidagi SQLite da saqlanadi.
// ASSETS (statik fayllar) build.py tomonidan shu fayl tepasiga qo'shiladi.
import { DurableObject } from "cloudflare:workers";

const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const J = (o, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const ERR = (m, st = 400) => J({ detail: m }, st);
const PBKDF2_ITER = 30000;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/")) {
      const stub = env.DB.get(env.DB.idFromName("main"));
      return stub.handle(req.method, url.pathname + url.search, await readBody(req), Object.fromEntries(req.headers));
    }
    let p = url.pathname === "/" ? "/index.html" : url.pathname;
    const f = ASSETS[p];
    if (!f) return new Response("Topilmadi", { status: 404 });
    const bin = Uint8Array.from(atob(f[1]), (c) => c.charCodeAt(0));
    const dyn = /\.(html|js|json|webmanifest)$/.test(p);
    return new Response(bin, { headers: { "content-type": f[0], "cache-control": dyn ? "no-cache" : "public, max-age=86400", "x-content-type-options": "nosniff", "referrer-policy": "same-origin", ...(p.endsWith(".html") ? { "permissions-policy": "camera=(self)" } : {}) } });
  },
};
async function readBody(req) {
  if (req.method === "GET" || req.method === "HEAD") return null;
  const t = await req.text();
  return t.length > 6_000_000 ? "" : t;
}

// ---------------------------------------------------------------- vaqt yordamchilari
const fmtCache = {};
function dtf(tz) {
  return (fmtCache[tz] ??= new Intl.DateTimeFormat("en-GB", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }));
}
function parts(ts, tz) {
  const o = {};
  for (const p of dtf(tz).formatToParts(new Date(ts * 1000))) o[p.type] = p.value;
  return o;
}
function tzOffset(ts, tz) { // soniyada: mahalliy - UTC
  const p = parts(ts, tz);
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) / 1000 - Math.floor(ts);
}
function validTz(tz) { try { dtf(tz); return true; } catch { return false; } }
function dayStart(dateStr, tz) { // mahalliy yarim tun (epoch s)
  const [y, m, d] = dateStr.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d) / 1000;
  let t = guess - tzOffset(guess, tz);
  t = guess - tzOffset(t, tz);
  return t;
}
const hms = (ts, tz) => { const p = parts(ts, tz); return `${p.hour}:${p.minute}:${p.second}`; };
const dateOf = (ts, tz) => { const p = parts(ts, tz); return `${p.year}-${p.month}-${p.day}`; };
function addDays(s, n) { const d = new Date(s + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
const hmMin = (v) => { const [h, m] = v.split(":").map(Number); return h * 60 + m; };
const now = () => Date.now() / 1000;

// ---------------------------------------------------------------- Durable Object
export class DB extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.fails = new Map();
    ctx.blockConcurrencyWhile(async () => this.init());
  }
  q(sql, ...a) { return [...this.sql.exec(sql, ...a)]; }
  one(sql, ...a) { return this.q(sql, ...a)[0]; }
  run(sql, ...a) { return this.sql.exec(sql, ...a); }
  insert(sql, ...a) { this.sql.exec(sql, ...a); return this.one("SELECT last_insert_rowid() AS id").id; }

  init() {
    this.run(`CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY, v TEXT)`);
    this.run(`CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, company TEXT DEFAULT '', pw_hash TEXT NOT NULL, created_at REAL NOT NULL)`);
    this.run(`CREATE TABLE IF NOT EXISTS settings(user_id INTEGER PRIMARY KEY, work_start TEXT DEFAULT '09:00', work_end TEXT DEFAULT '18:00', grace_sec INTEGER DEFAULT 90, min_event_sec INTEGER DEFAULT 3, talk_sensitivity REAL DEFAULT 1.0, tz TEXT DEFAULT 'Asia/Tashkent')`);
    this.run(`CREATE TABLE IF NOT EXISTS cameras(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, name TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'push', role TEXT DEFAULT 'office', enabled INTEGER DEFAULT 1, ingest_key TEXT NOT NULL, last_ts REAL DEFAULT 0, people INTEGER DEFAULT 0, created_at REAL NOT NULL)`);
    this.run(`CREATE TABLE IF NOT EXISTS employees(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, name TEXT NOT NULL, position TEXT DEFAULT '', embeddings TEXT DEFAULT '[]', gender TEXT DEFAULT '', active INTEGER DEFAULT 1, created_at REAL NOT NULL)`);
    this.run(`CREATE TABLE IF NOT EXISTS intervals(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, employee_id INTEGER, label TEXT DEFAULT '', camera_id INTEGER, kind TEXT NOT NULL, start_ts REAL NOT NULL, end_ts REAL NOT NULL, snapshot TEXT DEFAULT '')`);
    this.run(`CREATE INDEX IF NOT EXISTS ix_int ON intervals(user_id, end_ts, start_ts)`);
    this.run(`CREATE INDEX IF NOT EXISTS ix_int2 ON intervals(user_id, employee_id, kind, end_ts)`);
    this.run(`CREATE TABLE IF NOT EXISTS unknown_faces(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, camera_id INTEGER, label TEXT DEFAULT '', gender TEXT DEFAULT '', age INTEGER DEFAULT 0, embedding TEXT NOT NULL, photo TEXT DEFAULT '', first_ts REAL, last_ts REAL, seen INTEGER DEFAULT 1, status TEXT DEFAULT 'pending')`);
    this.run(`CREATE TABLE IF NOT EXISTS snaps(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, data TEXT NOT NULL, ts REAL)`);
    if (!this.one(`SELECT v FROM meta WHERE k='secret'`)) {
      this.run(`INSERT INTO meta VALUES('secret', ?)`, b64u(crypto.getRandomValues(new Uint8Array(32))));
    }
    this.secret = this.one(`SELECT v FROM meta WHERE k='secret'`).v;
  }

  // ------------------------------------------------ auth
  async hmacKey() { return (this._k ??= await crypto.subtle.importKey("raw", enc.encode(this.secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"])); }
  async makeToken(uid) {
    const h = b64u(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
    const p = b64u(enc.encode(JSON.stringify({ uid, exp: Math.floor(now()) + 86400 * 3 })));
    const sig = await crypto.subtle.sign("HMAC", await this.hmacKey(), enc.encode(h + "." + p));
    return `${h}.${p}.${b64u(sig)}`;
  }
  async userFromToken(tok) {
    try {
      const [h, p, s] = tok.split(".");
      if (!(await crypto.subtle.verify("HMAC", await this.hmacKey(), unb64u(s), enc.encode(h + "." + p)))) return null;
      const pl = JSON.parse(new TextDecoder().decode(unb64u(p)));
      if (pl.exp < now()) return null;
      return this.one(`SELECT id,email,name,company FROM users WHERE id=?`, pl.uid) || null;
    } catch { return null; }
  }
  async hashPw(pw, saltHex) {
    const salt = saltHex ? Uint8Array.from(saltHex.match(/../g).map((x) => parseInt(x, 16))) : crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITER }, key, 256);
    const hex = (u) => [...new Uint8Array(u)].map((b) => b.toString(16).padStart(2, "0")).join("");
    return hex(salt) + "$" + hex(bits);
  }
  async checkPw(pw, stored) {
    const [salt] = stored.split("$");
    const h = await this.hashPw(pw, salt);
    let diff = h.length ^ stored.length;
    for (let i = 0; i < h.length; i++) diff |= h.charCodeAt(i) ^ (stored.charCodeAt(i) || 0);
    return diff === 0;
  }
  settings(uid) {
    this.run(`INSERT OR IGNORE INTO settings(user_id) VALUES(?)`, uid);
    const r = this.one(`SELECT * FROM settings WHERE user_id=?`, uid);
    delete r.user_id;
    return r;
  }

  // ------------------------------------------------ marshrutlash
  async handle(method, pathq, bodyText, headers) {
    const url = new URL("http://x" + pathq);
    const p = url.pathname.slice(4);
    const qs = url.searchParams;
    let body = {};
    if (bodyText) { try { body = JSON.parse(bodyText); } catch { return ERR("JSON noto'g'ri"); } }
    try {
      // --- ochiq (kalit bilan) marshrutlar: brauzer-kamera
      if (p === "/monitor/config" && method === "GET") return this.monitorConfig(qs);
      if (p === "/monitor/events" && method === "POST") return this.monitorEvents(body);
      if (p === "/auth/register" && method === "POST") return await this.register(body);
      if (p === "/auth/login" && method === "POST") return await this.login(body, headers);

      const auth = headers["authorization"] || "";
      const tok = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : qs.get("token") || "";
      const u = tok ? await this.userFromToken(tok) : null;
      if (!u) return ERR("Tizimga qayta kiring", 401);
      return await this.routeAuthed(method, p, qs, body, u);
    } catch (e) {
      return ERR("Server xatosi: " + (e.message || e), 500);
    }
  }

  async register(b) {
    const email = String(b.email || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return ERR("Email noto'g'ri");
    if (String(b.password || "").length < 8) return ERR("Parol kamida 8 belgi bo'lsin");
    if (String(b.name || "").trim().length < 2) return ERR("Ismingizni kiriting");
    if (this.one(`SELECT id FROM users WHERE email=?`, email)) return ERR("Bu email bilan hisob allaqachon mavjud", 409);
    const id = this.insert(`INSERT INTO users(email,name,company,pw_hash,created_at) VALUES(?,?,?,?,?)`, email, String(b.name).trim().slice(0, 80), String(b.company || "").trim().slice(0, 120), await this.hashPw(String(b.password)), now());
    this.settings(id);
    return J({ token: await this.makeToken(id) });
  }
  async login(b, headers) {
    const email = String(b.email || "").trim().toLowerCase();
    const key = email + "|" + (headers["cf-connecting-ip"] || "");
    const f = (this.fails.get(key) || []).filter((t) => now() - t < 600);
    if (f.length >= 8) return ERR("Juda ko'p xato urinish. 10 daqiqadan so'ng qayta urinib ko'ring", 429);
    const u = this.one(`SELECT * FROM users WHERE email=?`, email);
    if (!u || !(await this.checkPw(String(b.password || ""), u.pw_hash))) {
      f.push(now()); this.fails.set(key, f);
      return ERR("Email yoki parol noto'g'ri", 401);
    }
    this.fails.delete(key);
    return J({ token: await this.makeToken(u.id) });
  }

  async routeAuthed(method, p, qs, b, u) {
    const uid = u.id;
    let m;
    if (p === "/me") return J(u);
    if (p === "/system") return J({ yolo: true, mediapipe: true, insightface: true, cameras_running: 1, edge: true });
    if (p === "/settings") return method === "GET" ? J(this.settings(uid)) : this.putSettings(uid, b);
    // kameralar
    if (p === "/cameras" && method === "GET") return J(this.q(`SELECT * FROM cameras WHERE user_id=? ORDER BY id`, uid).map((c) => this.camOut(c)));
    if (p === "/cameras" && method === "POST") return this.addCamera(uid, b);
    if (p === "/cameras/brands") return J([]);
    if (p === "/cameras/test") return J({ ok: true, message: "Brauzer kamerasi saqlangandan so'ng havola beriladi" });
    if ((m = p.match(/^\/cameras\/(\d+)$/))) {
      const c = this.one(`SELECT * FROM cameras WHERE id=? AND user_id=?`, +m[1], uid);
      if (!c) return ERR("Kamera topilmadi", 404);
      if (method === "DELETE") { this.run(`DELETE FROM cameras WHERE id=?`, c.id); return J({ ok: true }); }
      if (method === "PUT") {
        this.run(`UPDATE cameras SET name=?, role=?, enabled=? WHERE id=?`, String(b.name || c.name).slice(0, 80), b.role === "entrance" ? "entrance" : "office", b.enabled === false ? 0 : 1, c.id);
        return J(this.camOut(this.one(`SELECT * FROM cameras WHERE id=?`, c.id)));
      }
    }
    // xodimlar
    if (p === "/employees" && method === "GET") return J(this.q(`SELECT * FROM employees WHERE user_id=? AND active=1 ORDER BY name`, uid).map((e) => this.empOut(e)));
    if (p === "/employees" && method === "POST") {
      const name = String(b.name || "").trim();
      if (name.length < 2) return ERR("Ism kamida 2 harf");
      const id = this.insert(`INSERT INTO employees(user_id,name,position,gender,created_at) VALUES(?,?,?,?,?)`, uid, name.slice(0, 80), String(b.position || "").slice(0, 80), ["M", "F"].includes(b.gender) ? b.gender : "", now());
      return J(this.empOut(this.one(`SELECT * FROM employees WHERE id=?`, id)));
    }
    if (p === "/employees/descriptors") return J(this.q(`SELECT id,name,gender,embeddings FROM employees WHERE user_id=? AND active=1`, uid).map((e) => ({ id: e.id, name: e.name, gender: e.gender, descriptors: JSON.parse(e.embeddings || "[]") })));
    if ((m = p.match(/^\/employees\/(\d+)(\/faces|\/descriptors)?$/))) {
      const e = this.one(`SELECT * FROM employees WHERE id=? AND user_id=?`, +m[1], uid);
      if (!e) return ERR("Xodim topilmadi", 404);
      if (!m[2] && method === "PUT") {
        this.run(`UPDATE employees SET name=?, position=?, gender=? WHERE id=?`, String(b.name || e.name).slice(0, 80), String(b.position || "").slice(0, 80), ["M", "F"].includes(b.gender) ? b.gender : "", e.id);
        return J(this.empOut(this.one(`SELECT * FROM employees WHERE id=?`, e.id)));
      }
      if (!m[2] && method === "DELETE") { this.run(`UPDATE employees SET active=0, embeddings='[]' WHERE id=?`, e.id); return J({ ok: true }); }
      if (m[2] === "/faces" && method === "DELETE") { this.run(`UPDATE employees SET embeddings='[]' WHERE id=?`, e.id); return J({ ok: true }); }
      if (m[2] === "/descriptors" && method === "POST") return this.addDescriptors(e, b);
    }
    // tanilmagan yuzlar
    if (p === "/unknown") return J(this.q(`SELECT id,gender,age,seen,last_ts FROM unknown_faces WHERE user_id=? AND status='pending' ORDER BY last_ts DESC LIMIT 60`, uid).map((r) => ({ id: r.id, gender: r.gender, age: r.age, seen: r.seen, photo: "x", last: this.fmtShort(r.last_ts, uid) })));
    if ((m = p.match(/^\/unknown\/(\d+)\/photo$/))) {
      const r = this.one(`SELECT photo FROM unknown_faces WHERE id=? AND user_id=?`, +m[1], uid);
      return r && r.photo ? this.img(r.photo) : ERR("Topilmadi", 404);
    }
    if ((m = p.match(/^\/unknown\/(\d+)\/(assign|dismiss)$/))) return this.unknownAct(uid, +m[1], m[2], b);
    if ((m = p.match(/^\/snap\/(\d+)(\.jpg)?$/))) {
      const r = this.one(`SELECT data FROM snaps WHERE id=? AND user_id=?`, +m[1], uid);
      return r ? this.img(r.data) : ERR("Topilmadi", 404);
    }
    // hisobotlar
    if (p === "/reports/day") return J(this.buildDay(uid, qs.get("date") || this.today(uid)));
    if (p === "/reports/range") {
      const e = qs.get("end") || this.today(uid), s = qs.get("start") || addDays(e, -6);
      if (s > e) return ERR("Boshlanish sanasi tugash sanasidan keyin bo'lishi mumkin emas");
      return J(this.buildRange(uid, s, e));
    }
    if (p === "/reports/csv") {
      const e = qs.get("end") || this.today(uid), s = qs.get("start") || e;
      return new Response(this.toCsv(uid, s, e), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="hisobot_${s}_${e}.csv"` } });
    }
    if (p === "/events") return J(this.recentEvents(uid, Math.min(100, Math.max(1, +qs.get("limit") || 30))));
    if (p === "/demo/seed" && method === "POST") return this.seedDemo(uid);
    return ERR("Topilmadi", 404);
  }

  img(dataUrl) {
    const b64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
    return new Response(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)), { headers: { "content-type": "image/jpeg", "cache-control": "private, max-age=86400" } });
  }
  today(uid) { return dateOf(now(), this.settings(uid).tz); }
  fmtShort(ts, uid) { const tz = this.settings(uid).tz, p = parts(ts, tz); return `${p.day}.${p.month} ${p.hour}:${p.minute}`; }
  camOut(c) {
    const alive = c.last_ts && now() - c.last_ts < 15;
    return { id: c.id, user_id: c.user_id, name: c.name, source: c.source, role: c.role, enabled: c.enabled, ingest_key: c.ingest_key,
      status: !c.enabled ? "disabled" : alive ? "online" : c.last_ts ? "offline" : "starting", error: c.last_ts ? "" : c.source === "ip" ? "Ofis kompyuterida ko'prik dasturini va monitor sahifasini ishga tushiring (\"Ulash ko'rsatmasi\")" : "Telefon/noutbukda kamera sahifasini oching va \"Boshlash\"ni bosing", fps: alive ? 2 : 0, people: alive ? c.people : 0 };
  }
  empOut(e) { return { id: e.id, name: e.name, position: e.position, gender: e.gender, faces: JSON.parse(e.embeddings || "[]").length, active: !!e.active }; }

  putSettings(uid, b) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(b.work_start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(b.work_end)) return ERR("Vaqt formati noto'g'ri");
    if (!validTz(b.tz)) return ERR("Vaqt mintaqasi noto'g'ri (masalan: Asia/Tashkent)");
    const g = Math.min(1800, Math.max(15, +b.grace_sec || 90)), mn = Math.min(60, Math.max(1, +b.min_event_sec || 3)), ts = Math.min(3, Math.max(0.3, +b.talk_sensitivity || 1));
    this.settings(uid);
    this.run(`UPDATE settings SET work_start=?,work_end=?,grace_sec=?,min_event_sec=?,talk_sensitivity=?,tz=? WHERE user_id=?`, b.work_start, b.work_end, g, mn, ts, b.tz, uid);
    return J(this.settings(uid));
  }
  addCamera(uid, b) {
    const name = String(b.name || "").trim();
    if (!name) return ERR("Kamera nomini kiriting");
    const key = b64u(crypto.getRandomValues(new Uint8Array(18)));
    const id = this.insert(`INSERT INTO cameras(user_id,name,source,role,enabled,ingest_key,created_at) VALUES(?,?,?,?,?,?,?)`, uid, name.slice(0, 80), b.source === "ip" ? "ip" : "push", b.role === "entrance" ? "entrance" : "office", 1, key, now());
    return J(this.camOut(this.one(`SELECT * FROM cameras WHERE id=?`, id)));
  }

  addDescriptors(e, b) {
    const list = Array.isArray(b.descriptors) ? b.descriptors.filter((d) => Array.isArray(d) && d.length === 128 && d.every(Number.isFinite)) : [];
    if (!list.length) return ERR("Yuz vektori yo'q");
    const embs = [...JSON.parse(e.embeddings || "[]"), ...list.map((d) => d.map((x) => +x.toFixed(5)))].slice(-12);
    const gender = e.gender || (["M", "F"].includes(b.gender) ? b.gender : "");
    this.run(`UPDATE employees SET embeddings=?, gender=? WHERE id=?`, JSON.stringify(embs), gender, e.id);
    return J({ added: list.length, total: embs.length, gender });
  }

  unknownAct(uid, id, act, b) {
    const r = this.one(`SELECT * FROM unknown_faces WHERE id=? AND user_id=? AND status='pending'`, id, uid);
    if (!r) return ERR("Topilmadi", 404);
    if (act === "dismiss") { this.run(`UPDATE unknown_faces SET status='dismissed' WHERE id=?`, id); return J({ ok: true }); }
    let eid = +b.employee_id;
    if (eid) { if (!this.one(`SELECT id FROM employees WHERE id=? AND user_id=?`, eid, uid)) return ERR("Xodim topilmadi", 404); }
    else {
      const name = String(b.name || "").trim();
      if (name.length < 2) return ERR("Xodim ismini kiriting");
      eid = this.insert(`INSERT INTO employees(user_id,name,position,gender,created_at) VALUES(?,?,?,?,?)`, uid, name.slice(0, 80), String(b.position || "").slice(0, 80), r.gender, now());
    }
    const e = this.one(`SELECT * FROM employees WHERE id=?`, eid);
    const embs = [...JSON.parse(e.embeddings || "[]"), JSON.parse(r.embedding)].slice(-12);
    this.run(`UPDATE employees SET embeddings=?, gender=? WHERE id=?`, JSON.stringify(embs), e.gender || r.gender, eid);
    for (const label of r.label.split("|").filter(Boolean)) this.run(`UPDATE intervals SET employee_id=?, label='' WHERE user_id=? AND label=?`, eid, uid, label);
    this.run(`UPDATE unknown_faces SET status='assigned' WHERE id=?`, id);
    return J({ ok: true, employee_id: eid });
  }

  // ------------------------------------------------ brauzer-kamera (AI telefon/noutbukda ishlaydi)
  camByKey(c, k) {
    const cam = this.one(`SELECT * FROM cameras WHERE id=?`, +c);
    if (!cam || !cam.enabled || !k || k.length !== cam.ingest_key.length) return null;
    let d = 0;
    for (let i = 0; i < k.length; i++) d |= k.charCodeAt(i) ^ cam.ingest_key.charCodeAt(i);
    return d === 0 ? cam : null;
  }
  monitorConfig(qs) {
    const cam = this.camByKey(qs.get("c"), qs.get("k"));
    if (!cam) return ERR("Kamera kaliti noto'g'ri", 403);
    const st = this.settings(cam.user_id);
    const emps = this.q(`SELECT id,name,gender,embeddings FROM employees WHERE user_id=? AND active=1`, cam.user_id)
      .map((e) => ({ id: e.id, name: e.name, gender: e.gender, descriptors: JSON.parse(e.embeddings || "[]") })).filter((e) => e.descriptors.length);
    return J({ camera: { id: cam.id, name: cam.name }, settings: { min_event_sec: st.min_event_sec, talk_sensitivity: st.talk_sensitivity }, employees: emps });
  }
  /** Har ~1 soniyada brauzer ko'rinayotgan odamlar va ularning holatini yuboradi. */
  monitorEvents(b) {
    const cam = this.camByKey(b.c, b.k);
    if (!cam) return ERR("Kamera kaliti noto'g'ri", 403);
    const st = this.settings(cam.user_id), ts = now();
    const gapOf = (k) => (k === "present" ? st.grace_sec : 6);
    const people = Array.isArray(b.people) ? b.people.slice(0, 20) : [];
    const touched = {};
    for (const p of people) {
      const eid = +p.eid || null;
      const label = eid ? "" : String(p.label || "Noma'lum").slice(0, 80);
      if (eid && !this.one(`SELECT id FROM employees WHERE id=? AND user_id=?`, eid, cam.user_id)) continue;
      if (eid && typeof p.from === "string" && p.from) this.run(`UPDATE intervals SET employee_id=?, label='' WHERE user_id=? AND label=?`, eid, cam.user_id, p.from.slice(0, 80));
      const kinds = ["present", ...(Array.isArray(p.kinds) ? p.kinds.filter((k) => ["phone_call", "phone_use", "talking"].includes(k)) : [])];
      for (const kind of kinds) {
        const id = this.see(cam, eid, label, kind, ts, gapOf(kind));
        if (kind !== "present" && p.snaps && p.snaps[kind] && typeof p.snaps[kind] === "string" && p.snaps[kind].length < 400000) {
          const iv = this.one(`SELECT snapshot FROM intervals WHERE id=?`, id);
          if (iv && !iv.snapshot) {
            const sid = this.insert(`INSERT INTO snaps(user_id,data,ts) VALUES(?,?,?)`, cam.user_id, p.snaps[kind], ts);
            this.run(`UPDATE intervals SET snapshot=? WHERE id=?`, String(sid) + ".jpg", id);
          }
        }
      }
    }
    for (const u of (Array.isArray(b.unknown) ? b.unknown.slice(0, 3) : [])) this.saveUnknown(cam, u);
    this.run(`UPDATE cameras SET last_ts=?, people=? WHERE id=?`, ts, people.length, cam.id);
    return J({ ok: true });
  }
  see(cam, eid, label, kind, ts, gap) {
    const row = eid
      ? this.one(`SELECT id FROM intervals WHERE user_id=? AND employee_id=? AND kind=? AND end_ts>=? ORDER BY end_ts DESC LIMIT 1`, cam.user_id, eid, kind, ts - gap)
      : this.one(`SELECT id FROM intervals WHERE user_id=? AND employee_id IS NULL AND label=? AND kind=? AND end_ts>=? ORDER BY end_ts DESC LIMIT 1`, cam.user_id, label, kind, ts - gap);
    if (row) { this.run(`UPDATE intervals SET end_ts=? WHERE id=?`, ts, row.id); return row.id; }
    return this.insert(`INSERT INTO intervals(user_id,employee_id,label,camera_id,kind,start_ts,end_ts) VALUES(?,?,?,?,?,?,?)`, cam.user_id, eid, label, cam.id, kind, ts, ts);
  }
  saveUnknown(cam, u) {
    if (!Array.isArray(u.descriptor) || u.descriptor.length !== 128) return;
    const label = String(u.label || "").slice(0, 80);
    const t = now();
    for (const r of this.q(`SELECT id,embedding,label FROM unknown_faces WHERE user_id=? AND status='pending' AND last_ts>?`, cam.user_id, t - 7 * 86400)) {
      const e = JSON.parse(r.embedding);
      let s = 0;
      for (let i = 0; i < 128; i++) s += (e[i] - u.descriptor[i]) ** 2;
      if (Math.sqrt(s) < 0.4) {
        const labels = r.label.split("|").filter(Boolean);
        if (!labels.includes(label)) labels.push(label);
        this.run(`UPDATE unknown_faces SET last_ts=?, seen=seen+1, label=? WHERE id=?`, t, labels.slice(-50).join("|"), r.id);
        return;
      }
    }
    const photo = typeof u.photo === "string" && u.photo.length < 200000 ? u.photo : "";
    this.run(`INSERT INTO unknown_faces(user_id,camera_id,label,gender,age,embedding,photo,first_ts,last_ts) VALUES(?,?,?,?,?,?,?,?,?)`,
      cam.user_id, cam.id, label, ["M", "F"].includes(u.gender) ? u.gender : "", Math.round(+u.age || 0), JSON.stringify(u.descriptor.map((x) => +(+x).toFixed(5))), photo, t, t);
  }

  // ------------------------------------------------ hisobotlar (reports.py ning JS varianti)
  buildDay(uid, dateStr, nowTs = now()) {
    const st = this.settings(uid), tz = st.tz;
    const s = dayStart(dateStr, tz), e = dayStart(addDays(dateStr, 1), tz);
    const isToday = s <= nowTs && nowTs < e;
    const rows = this.q(`SELECT * FROM intervals WHERE user_id=? AND end_ts>=? AND start_ts<? ORDER BY start_ts`, uid, s, e);
    const emps = {};
    for (const r of this.q(`SELECT id,name,position,gender FROM employees WHERE user_id=? AND active=1`, uid)) emps[r.id] = r;
    const groups = new Map();
    for (const id of Object.keys(emps)) groups.set("e" + id, []);
    for (const r of rows) {
      const key = r.employee_id ? "e" + r.employee_id : "u" + (r.label || "Noma'lum shaxs");
      if (r.employee_id && !emps[r.employee_id]) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }
    const workStart = hmMin(st.work_start) * 60, workEnd = hmMin(st.work_end) * 60;
    const people = [];
    for (const [key, rs] of groups) {
      const isE = key[0] === "e";
      const emp = isE ? emps[key.slice(1)] : null;
      const p = { employee_id: emp ? emp.id : null, name: emp ? emp.name : key.slice(1), position: emp ? emp.position : "", unknown: !emp, gender: emp ? emp.gender : "" };
      const cl = { present: [], phone_call: [], phone_use: [], talking: [] };
      for (const r of rs) {
        const a = Math.max(r.start_ts, s), b = Math.min(r.end_ts, e);
        const len = b - a;
        if (r.kind === "present" ? (b > a || b === a) && (isE || len >= 5) : len >= st.min_event_sec) cl[r.kind].push([a, b, r]);
      }
      const merged = [];
      for (const [a, b] of cl.present.map((x) => [x[0], x[1]]).sort((x, y) => x[0] - y[0])) {
        if (merged.length && a <= merged[merged.length - 1][1] + st.grace_sec) merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], b);
        else merged.push([a, b]);
      }
      p.worked_sec = Math.round(merged.reduce((t, [a, b]) => t + b - a, 0));
      p.arrival = merged.length ? hms(merged[0][0], tz) : null;
      p.arrival_ts = merged.length ? merged[0][0] : null;
      p.late_min = merged.length ? Math.max(0, Math.floor((merged[0][0] - s - workStart) / 60)) : 0;
      const livePresent = merged.length && isToday && nowTs - merged[merged.length - 1][1] <= 15;
      p.last_seen = merged.length ? hms(merged[merged.length - 1][1], tz) : null;
      p.departure = livePresent || !merged.length ? null : hms(merged[merged.length - 1][1], tz);
      const away = [];
      for (let i = 1; i < merged.length; i++) away.push({ start: merged[i - 1][1], end: merged[i][0] });
      if (isToday && merged.length && !livePresent && nowTs - s < workEnd) { away.push({ start: merged[merged.length - 1][1], end: nowTs, ongoing: true }); p.departure = null; }
      for (const a of away) { a.dur = Math.round(a.end - a.start); a.start_s = hms(a.start, tz); a.end_s = hms(a.end, tz); a.from = a.start - s; a.to = a.end - s; }
      p.away = away; p.away_sec = away.reduce((t, a) => t + a.dur, 0); p.away_count = away.length;
      const events = [];
      for (const k of ["phone_call", "phone_use", "talking"]) {
        p[k] = { sec: Math.round(cl[k].reduce((t, [a, b]) => t + b - a, 0)), count: cl[k].length };
        for (const [a, b, r] of cl[k]) events.push({ kind: k, start: hms(a, tz), end: hms(b, tz), dur: Math.round(b - a), snapshot: r.snapshot || "", from_: a - s, to: b - s, ts: a });
      }
      events.sort((x, y) => x.ts - y.ts);
      p.events = events;
      p.timeline = { present: merged.map(([a, b]) => [a - s, b - s]), away: away.map((a) => [a.from, a.to]) };
      for (const k of ["phone_call", "phone_use", "talking"]) p.timeline[k] = cl[k].map(([a, b]) => [a - s, b - s]);
      if (isToday) {
        const live = new Set();
        for (const k of ["phone_call", "phone_use", "talking"]) if (cl[k].length && nowTs - cl[k][cl[k].length - 1][1] <= 15) live.add(k);
        p.status = livePresent ? (live.has("phone_call") ? "phone_call" : live.has("phone_use") ? "phone_use" : live.has("talking") ? "talking" : "working") : merged.length ? "away" : "absent";
      } else p.status = merged.length ? "present_day" : "absent";
      p.came = merged.length > 0;
      people.push(p);
    }
    people.sort((a, b) => (a.unknown - b.unknown) || (!a.came - !b.came) || a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    const known = people.filter((p) => !p.unknown), came = known.filter((p) => p.came);
    const sum = (arr, f) => arr.reduce((t, p) => t + f(p), 0);
    const summary = {
      total: known.length, came: came.length, absent: known.length - came.length, late: came.filter((p) => p.late_min > 0).length,
      male: came.filter((p) => p.gender === "M").length, female: came.filter((p) => p.gender === "F").length,
      unknown_count: people.filter((p) => p.unknown && p.came).length,
      now_present: came.filter((p) => ["working", "phone_call", "phone_use", "talking"].includes(p.status)).length,
      on_phone: came.filter((p) => ["phone_call", "phone_use"].includes(p.status)).length,
      talking: came.filter((p) => p.status === "talking").length,
      phone_sec: sum(came, (p) => p.phone_call.sec + p.phone_use.sec), talk_sec: sum(came, (p) => p.talking.sec),
      away_sec: sum(came, (p) => p.away_sec), worked_sec: sum(came, (p) => p.worked_sec),
    };
    return { date: dateStr, is_today: isToday, work_start: st.work_start, work_end: st.work_end, tz, summary, people };
  }
  buildRange(uid, start, end) {
    const days = [], agg = {};
    for (let d = start; d <= end && days.length < 92; d = addDays(d, 1)) {
      const day = this.buildDay(uid, d), s = day.summary;
      days.push({ date: d, came: s.came, late: s.late, phone_sec: s.phone_sec, talk_sec: s.talk_sec, away_sec: s.away_sec, worked_sec: s.worked_sec });
      for (const p of day.people) {
        const k = p.employee_id ?? p.name;
        const a = (agg[k] ??= { employee_id: p.employee_id, name: p.name, position: p.position, unknown: p.unknown, days_came: 0, late_days: 0, late_min: 0, worked_sec: 0, away_sec: 0, away_count: 0, phone_call_sec: 0, phone_call_count: 0, phone_use_sec: 0, phone_use_count: 0, talking_sec: 0, talking_count: 0 });
        if (p.came) { a.days_came++; if (p.late_min > 0) { a.late_days++; a.late_min += p.late_min; } }
        a.worked_sec += p.worked_sec; a.away_sec += p.away_sec; a.away_count += p.away_count;
        for (const q of ["phone_call", "phone_use", "talking"]) { a[q + "_sec"] += p[q].sec; a[q + "_count"] += p[q].count; }
      }
    }
    return { start, end, people: Object.values(agg).sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())), days };
  }
  toCsv(uid, start, end) {
    const dur = (s) => { s = Math.round(s); const p = (n) => String(n).padStart(2, "0"); return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`; };
    let out = "﻿Sana;Xodim;Lavozim;Kelgan vaqti;Kechikish (daq);Ketgan vaqti;Ishxonada (s:d:s);Tashqarida (s:d:s);Chiqishlar soni;Telefonda gaplashgan (s:d:s);Qo'ng'iroqlar soni;Telefon ishlatgan (s:d:s);Telefon holatlari soni;Gaplashgan (s:d:s);Gaplashuvlar soni\n";
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    for (let d = start, n = 0; d <= end && n < 92; d = addDays(d, 1), n++) {
      for (const p of this.buildDay(uid, d).people) if (p.came)
        out += [d, q(p.name), q(p.position), p.arrival, p.late_min, p.departure || "", dur(p.worked_sec), dur(p.away_sec), p.away_count, dur(p.phone_call.sec), p.phone_call.count, dur(p.phone_use.sec), p.phone_use.count, dur(p.talking.sec), p.talking.count].join(";") + "\n";
    }
    return out;
  }
  recentEvents(uid, limit) {
    const tz = this.settings(uid).tz;
    return this.q(`SELECT i.*, e.name AS ename FROM intervals i LEFT JOIN employees e ON e.id=i.employee_id WHERE i.user_id=? AND i.kind!='present' AND i.end_ts-i.start_ts>=? ORDER BY i.start_ts DESC LIMIT ?`, uid, this.settings(uid).min_event_sec, limit)
      .map((r) => { const p = parts(r.start_ts, tz); return { id: r.id, kind: r.kind, name: r.ename || r.label || "Noma'lum", time: `${p.hour}:${p.minute}:${p.second}`, date: `${p.day}.${p.month}`, dur: Math.round(r.end_ts - r.start_ts), snapshot: r.snapshot || "" }; });
  }

  // ------------------------------------------------ demo tarix (ixtiyoriy)
  seedDemo(uid) {
    const names = [["Aziz Karimov", "Menejer", "M"], ["Malika Yusupova", "Buxgalter", "F"], ["Jasur Toshmatov", "Dasturchi", "M"], ["Dilnoza Rahimova", "Dizayner", "F"], ["Sardor Ismoilov", "Sotuv bo'limi", "M"], ["Nigora Abdullayeva", "Operator", "F"]];
    const st = this.settings(uid), tz = st.tz;
    const ids = names.map(([n, pos, g]) => (this.one(`SELECT id FROM employees WHERE user_id=? AND name=?`, uid, n)?.id) ?? this.insert(`INSERT INTO employees(user_id,name,position,gender,created_at) VALUES(?,?,?,?,?)`, uid, n, pos, g, now()));
    const t0 = now(), today = dateOf(t0, tz);
    this.run(`DELETE FROM intervals WHERE user_id=? AND snapshot='' AND camera_id IS NULL`, uid);
    let seed = 12345; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296), ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const [wh, wm] = st.work_start.split(":").map(Number);
    for (let back = 7; back >= 0; back--) {
      const d = addDays(today, -back), s0 = dayStart(d, tz);
      if (new Date(d + "T12:00:00Z").getUTCDay() === 0) continue;
      ids.forEach((eid, ei) => {
        if (rnd() < 0.07 && back > 0) return;
        const late = ei === 2 ? [5, 18, 33][ri(0, 2)] : [-25, -15, -8, -3, 0, 4, 12, 25, 40][ri(0, 8)];
        const arrive = s0 + (wh * 60 + wm + late) * 60 + ri(0, 59), leave = s0 + (18 * 60 + ri(-20, 35)) * 60;
        const end = back === 0 ? Math.min(leave, t0) : leave;
        if (end <= arrive) return;
        let outs = [[s0 + 13 * 3600 + ri(0, 1800), ri(35, 65) * 60]];
        for (let i = ri(1, 3); i > 0; i--) outs.push([arrive + ri(1, 7) * 3600 + ri(0, 3000), ri(4, 22) * 60]);
        outs = outs.map(([a, dur]) => [a, a + dur]).filter(([a]) => a > arrive + 600 && a < end - 600).sort((x, y) => x[0] - y[0]);
        const segs = []; let cur = arrive;
        for (const [a, b] of outs) { if (a < cur + 300) continue; segs.push([cur, a]); cur = b; }
        if (cur < end) segs.push([cur, end]);
        const ins = (kind, a, b) => this.run(`INSERT INTO intervals(user_id,employee_id,label,kind,start_ts,end_ts) VALUES(?,?,'',?,?,?)`, uid, eid, kind, a, b);
        for (const [a, b] of segs) if (b > a) ins("present", a, b);
        const heavy = ei === 1 || ei === 4 ? 1.8 : 1;
        for (const [kind, [nl, nh], [dl, dh]] of [["phone_call", [2, 7], [25, 280]], ["phone_use", [3, 10], [30, 420]], ["talking", [5, 14], [20, 240]]])
          for (let i = Math.floor(ri(nl, nh) * heavy); i > 0; i--) {
            const seg = segs[ri(0, segs.length - 1)]; if (!seg || seg[1] - seg[0] < 700) continue;
            const a = seg[0] + ri(0, Math.floor(seg[1] - seg[0] - 600)), dur = ri(dl, dh);
            if (a + dur > t0) continue;
            ins(kind, a, a + dur);
          }
      });
    }
    return J({ ok: true });
  }
}
