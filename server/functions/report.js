'use strict';
// Mijoz uchun ochiq loyiha holati sahifasi: /r/<kalit> (narx va toʻlovlar koʻrsatilmaydi)
const S = require('./_shared');
const { esc } = S;

const L = {
  uz: { title: 'Loyiha holati', status: { new: 'Yangi', work: 'Jarayonda', review: 'Tekshiruvda', done: 'Tayyor', paused: 'Toʻxtatilgan' }, deadline: 'Topshirish muddati', tasks: 'Bajariladigan ishlar', updated: 'Yangilangan', by: 'Tayyorladi', left: (n) => `${n} kun qoldi`, over: (n) => `${n} kun kechikdi`, today: 'Bugun', none: 'Havola topilmadi yoki oʻchirilgan.' },
  ru: { title: 'Статус проекта', status: { new: 'Новый', work: 'В работе', review: 'На проверке', done: 'Готов', paused: 'Пауза' }, deadline: 'Срок сдачи', tasks: 'Список работ', updated: 'Обновлено', by: 'Подготовил', left: (n) => `осталось ${n} дн.`, over: (n) => `просрочено на ${n} дн.`, today: 'Сегодня', none: 'Ссылка не найдена или отключена.' },
  en: { title: 'Project status', status: { new: 'New', work: 'In progress', review: 'In review', done: 'Done', paused: 'Paused' }, deadline: 'Delivery date', tasks: 'Work items', updated: 'Updated', by: 'Prepared by', left: (n) => `${n} day${n === 1 ? '' : 's'} left`, over: (n) => `${n} day${n === 1 ? '' : 's'} overdue`, today: 'Today', none: 'Link not found or disabled.' },
};
const page = (code, body, lang = 'uz') => ({
  statusCode: code,
  headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  body: `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(L[lang].title)}</title>
<style>:root{color-scheme:light dark;--bg:#f4f7fb;--card:#fff;--tx:#0f1b2d;--mu:#64748b;--ln:#e2e8f0;--a:#14b8a6;--b:#3b82f6}@media(prefers-color-scheme:dark){:root{--bg:#0b1220;--card:#131c2e;--tx:#e8eef9;--mu:#94a3b8;--ln:#24324a}}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(900px 500px at 10% -10%,color-mix(in srgb,var(--a) 22%,transparent),transparent),var(--bg);color:var(--tx);font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main{max-width:560px;margin:0 auto;padding:28px 16px 48px}.card{background:var(--card);border:1px solid var(--ln);border-radius:22px;padding:22px;box-shadow:0 20px 40px -28px rgba(15,27,45,.4)}
h1{margin:0 0 4px;font-size:24px;line-height:1.2}.mu{color:var(--mu);font-size:14px}.pill{display:inline-block;padding:4px 12px;border-radius:99px;font-weight:700;font-size:13px;background:color-mix(in srgb,var(--a) 18%,transparent);color:var(--a);margin:10px 0}
.bar{height:12px;border-radius:99px;background:var(--ln);overflow:hidden;margin:14px 0 6px}.bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--a),var(--b))}.pc{font-size:34px;font-weight:800}
.row{display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-top:1px solid var(--ln)}h2{font-size:15px;margin:22px 0 4px;color:var(--mu);text-transform:uppercase;letter-spacing:.06em}
ul{list-style:none;margin:0;padding:0}li{display:flex;gap:10px;padding:10px 0;border-top:1px solid var(--ln)}li b{flex:none;width:22px;height:22px;border-radius:7px;border:2px solid var(--ln);display:grid;place-items:center;font-size:14px;color:#fff}li.ok b{background:var(--a);border-color:var(--a)}li.ok span{color:var(--mu);text-decoration:line-through}footer{text-align:center;color:var(--mu);font-size:13px;margin-top:18px}</style></head><body><main>${body}</main></body></html>`,
});

exports.handler = async (event) => {
  const tok = String(event.path || '').split('/').filter(Boolean).pop() || '';
  if (!/^[a-f0-9]{20}$/.test(tok)) return page(404, `<div class="card"><p>${esc(L.uz.none)}</p></div>`);
  const st = S.openStore(event);
  const ref = await st.get(`rep/${tok}`);
  const [uid, pid] = String(ref || '').split(':');
  const u = uid ? await S.getUser(st, uid) : null;
  const p = u && u.projects.find((x) => x.id === pid);
  const lang = u && L[u.lang] ? u.lang : 'uz', T = L[lang];
  if (!p || !u.reports || u.reports[pid] !== tok) return page(404, `<div class="card"><p>${esc(T.none)}</p></div>`, lang);
  const today = S.todayISO(u.tz), { done, total } = S.projProgress(p), pc = p.status === 'done' ? 100 : total ? Math.round((done / total) * 100) : 0;
  const d = S.daysBetween(today, p.date), tag = p.status === 'done' ? '' : d < 0 ? T.over(-d) : d === 0 ? T.today : T.left(d);
  const Tb = S.Tof(u);
  const items = p.tasks.map((t) => `<li class="${t.done || p.status === 'done' ? 'ok' : ''}"><b>${t.done || p.status === 'done' ? '✓' : ''}</b><span>${esc(t.text)}</span></li>`).join('');
  const body = `<div class="card"><p class="mu">${S.PICON[p.type]} ${esc(Tb.p.types[p.type])}${p.client ? ' · ' + esc(p.client) : ''}</p><h1>${esc(p.name)}</h1><span class="pill">${esc(T.status[p.status])}</span>
<div class="pc">${pc}%</div><div class="bar"><i style="width:${pc}%"></i></div>
<div class="row"><span class="mu">${esc(T.deadline)}</span><b>${esc(S.fmtWd(p.date, Tb))}${tag ? ` · <span class="mu">${esc(tag)}</span>` : ''}</b></div>
${total ? `<h2>${esc(T.tasks)} · ${done}/${total}</h2><ul>${items}</ul>` : ''}
<div class="row"><span class="mu">${esc(T.updated)}</span><span>${esc(S.fmtShort(S.isoOfLocal(S.localNow(u.tz, p.updatedAt || Date.now())), Tb))}</span></div></div>
<footer>${esc(T.by)}: ${esc(u.name || 'Impro It')}</footer>`;
  return page(200, body, lang);
};
