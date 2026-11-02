# Irodamed saytini Cloudflare Pages'ga ulash

Sayt oddiy statik sayt (`index.html`, `style.css`, `script.js`). Build kerak emas.
Saydana saytidan alohida: `saydana/` papkasiga tegmaydi.

Cloudflare → **Workers & Pages** → **Create application** → **Continue to Pages** → **Import an existing Git repository**:

| Maydon | Qiymat |
|---|---|
| Repository | `Uchrashuvlar-miniapp` |
| Project name | `irodamed` (band bo'lsa, `irodamed-uz`) |
| Production branch | `claude/saydana-medical-center-site-ccqhxs` (yoki `main`) |
| Framework preset | `None` |
| Build command | bo'sh |
| Build output directory | `irodamed` |

**Save and Deploy**. Keyin shu branchga push qilingan har bir o'zgarish 1-2 daqiqada saytni yangilaydi.
