const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); try { tg.setHeaderColor('#FFD213'); tg.setBackgroundColor('#FFF6D6'); } catch {} }

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + " so'm";

let menu = [], settings = {};
let cart = {}; // id -> qty
let promo = null; // { code, percent }
let form = { name: '', phone: '', address: '', comment: '', type: 'delivery' };
try { Object.assign(form, JSON.parse(localStorage.getItem('bz_form') || '{}'), { comment: '' }); } catch {}

const items = () => menu.flatMap((c) => c.items);
const find = (id) => items().find((i) => i.id === id);
const subtotal = () => Object.entries(cart).reduce((s, [id, q]) => s + (find(id)?.price || 0) * q, 0);
const discount = () => (promo ? Math.round((subtotal() * promo.percent) / 100 / 100) * 100 : 0);
const count = () => Object.values(cart).reduce((a, b) => a + b, 0);

function toast(t) {
  const el = $('toast'); el.textContent = t; el.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (el.hidden = true), 2600);
}
const haptic = () => { try { tg?.HapticFeedback?.impactOccurred('light'); } catch {} };

async function load() {
  const r = await fetch('/api/menu'); const d = await r.json();
  menu = d.menu; settings = d.settings;
  $('info').innerHTML = `<span>📍 ${esc(settings.address)}</span><span>🕘 ${esc(settings.hours)}</span><span>🛵 Dostavka bepul</span>`;
  $('footer').innerHTML = `Buyurtma uchun: <b>${esc(settings.phone)}</b>`;
  $('closed').hidden = settings.open;
  $('stories').innerHTML = menu.map((c) => `<button class="story" data-cat="${esc(c.id)}"><div class="ring"><div class="dot" style="${c.img ? `background-image:url(${esc(c.img)})` : ''}">${c.img ? '' : esc(c.emoji)}</div></div><span>${esc(c.name)}</span></button>`).join('');
  renderMenu();
  updateBar();
}

function renderMenu() {
  $('menu').innerHTML = menu.map((c) => `
    <section class="cat" id="cat-${esc(c.id)}">
      <h2>${esc(c.emoji)} ${esc(c.name)}</h2>
      <div class="items">${c.items.map((i) => itemHtml(i, c)).join('')}</div>
    </section>`).join('');
}
function itemHtml(i, cat = menu.find((c) => c.items.some((x) => x.id === i.id))) {
  const q = cart[i.id] || 0;
  const ctrl = !i.available ? '<span class="soldout">Tugagan</span>'
    : q ? `<div class="qty"><button data-dec="${i.id}">−</button><b>${q}</b><button data-inc="${i.id}">+</button></div>`
    : `<button class="add" data-inc="${i.id}">+ Qo'shish</button>`;
  const ph = i.img ? `<img src="${esc(i.img)}" alt="${esc(i.name)}" loading="lazy">` : `<div class="noimg">${esc(cat?.emoji || '🍽')}</div>`;
  return `<div class="item ${i.available ? '' : 'off'} ${q ? 'sel' : ''}" id="it-${i.id}"><div class="ph">${ph}${q ? `<span class="badge">${q}</span>` : ''}</div><div class="body"><div class="n">${esc(i.name)}</div>${i.desc ? `<div class="d">${esc(i.desc)}</div>` : ''}<div class="p">${fmt(i.price)}</div><div class="ctl">${ctrl}</div></div></div>`;
}
function refreshItem(id) { const el = $('it-' + id); if (el) el.outerHTML = itemHtml(find(id)); }

function change(id, d) {
  const n = Math.max(0, Math.min(50, (cart[id] || 0) + d));
  if (n) cart[id] = n; else delete cart[id];
  haptic(); refreshItem(id); updateBar();
  if (!$('sheet').hidden) renderCart();
}
function updateBar() {
  const b = $('cartBar');
  if (!count() || !$('sheet').hidden) { b.hidden = true; return; }
  b.hidden = false;
  b.innerHTML = `<span>🛒 Savat · ${count()} ta</span><span>${fmt(subtotal() - discount())}</span>`;
}

function openSheet(title) { $('sheetTitle').textContent = title; $('sheet').hidden = false; $('cartBar').hidden = true; }
function closeSheet() { $('sheet').hidden = true; updateBar(); }

function totals() {
  const s = subtotal(), d = discount();
  return `<div class="sum"><span>Jami</span><span>${fmt(s)}</span></div>
    ${promo ? `<div class="sum disc"><span>Promokod ${esc(promo.code)} (−${promo.percent}%)</span><span>−${fmt(d)}</span></div>` : ''}
    <div class="sum"><span>Yetkazib berish</span><span>Bepul 🛵</span></div>
    <div class="sum total"><span>To'lash</span><span>${fmt(s - d)}</span></div>`;
}

function renderCart() {
  if (!count()) { closeSheet(); return; }
  const rows = Object.entries(cart).map(([id, q]) => { const i = find(id); return `<div class="row"><div><div class="n">${esc(i.name)}</div><div class="d">${fmt(i.price)}</div></div><div class="qty"><button data-dec="${id}">−</button><b>${q}</b><button data-inc="${id}">+</button></div></div>`; }).join('');
  const keep = { code: $('promoIn')?.value ?? '', msg: $('promoMsg')?.innerHTML ?? '' };
  $('sheetContent').innerHTML = `${rows}
    <div class="promo"><input id="promoIn" placeholder="Promokod" maxlength="20" value="${esc(promo ? promo.code : keep.code)}"><button id="promoBtn">Qo'llash</button></div>
    <div class="msg ${promo ? 'ok' : ''}" id="promoMsg">${promo ? `✅ Promokod qo'llandi: −${promo.percent}%` : keep.msg}</div>
    <div id="totals">${totals()}</div>
    <div class="seg"><button data-type="delivery" class="${form.type === 'delivery' ? 'on' : ''}">🛵 Yetkazib berish</button><button data-type="pickup" class="${form.type === 'pickup' ? 'on' : ''}">🏃 Olib ketaman</button></div>
    <input id="fName" placeholder="Ismingiz" value="${esc(form.name)}" maxlength="60" autocomplete="name">
    <input id="fPhone" type="tel" placeholder="Telefon: 90 123 45 67" value="${esc(form.phone)}" maxlength="25" autocomplete="tel">
    ${form.type === 'delivery' ? `<input id="fAddr" placeholder="Manzil (ko'cha, uy, mo'ljal)" value="${esc(form.address)}" maxlength="200" autocomplete="street-address">` : ''}
    <textarea id="fComm" rows="2" placeholder="Izoh (ixtiyoriy)" maxlength="300"></textarea>
    <button class="primary" id="orderBtn">Buyurtma berish · ${fmt(subtotal() - discount())}</button>`;
}

async function applyPromo() {
  const code = $('promoIn').value.trim();
  if (!code) return;
  const r = await fetch('/api/promo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, initData: tg?.initData || '' }) });
  const d = await r.json();
  if (r.ok) { promo = d; haptic(); renderCart(); }
  else { promo = null; renderCart(); $('promoIn').value = code; $('promoMsg').className = 'msg err'; $('promoMsg').textContent = '❌ ' + d.error; }
}

function readForm() {
  form.name = $('fName').value.trim(); form.phone = $('fPhone').value.trim();
  if ($('fAddr')) form.address = $('fAddr').value.trim();
  form.comment = $('fComm').value.trim();
  try { localStorage.setItem('bz_form', JSON.stringify({ name: form.name, phone: form.phone, address: form.address, type: form.type })); } catch {}
}

async function order() {
  readForm();
  if (!form.name) return toast('Ismingizni kiriting');
  if (form.phone.replace(/\D/g, '').length < 9) return toast('Telefon raqamni to\'g\'ri kiriting');
  if (form.type === 'delivery' && form.address.length < 3) return toast('Manzilni kiriting');
  const btn = $('orderBtn'); btn.disabled = true; btn.textContent = 'Yuborilmoqda...';
  try {
    const r = await fetch('/api/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      initData: tg?.initData || '', items: Object.entries(cart).map(([id, qty]) => ({ id, qty })),
      promo: promo?.code || '', ...form,
    }) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Xatolik');
    try { tg?.HapticFeedback?.notificationOccurred('success'); } catch {}
    cart = {}; promo = null; renderMenu(); updateBar();
    $('sheetTitle').textContent = 'Rahmat!';
    $('sheetContent').innerHTML = `<div class="done"><div class="big">✅</div><h3>Buyurtma #${d.id} qabul qilindi</h3><p>To'lash: <b>${fmt(d.total)}</b><br>Tez orada siz bilan bog'lanamiz.</p><button class="primary" data-close>Yopish</button></div>`;
  } catch (e) {
    toast(e.message); btn.disabled = false; btn.textContent = 'Buyurtma berish';
  }
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('button,[data-close]'); if (!t) return;
  if (t.dataset.inc) change(t.dataset.inc, 1);
  else if (t.dataset.dec) change(t.dataset.dec, -1);
  else if (t.dataset.cat) {
    document.querySelectorAll('.story').forEach((s) => s.classList.toggle('on', s === t));
    $('cat-' + t.dataset.cat).scrollIntoView({ behavior: 'smooth' });
  } else if (t.id === 'cartBar') { if (!settings.open) return toast('Hozir buyurtma qabul qilinmayapti'); renderCart(); openSheet('Savat'); }
  else if (t.id === 'promoBtn') applyPromo();
  else if (t.id === 'orderBtn') order();
  else if (t.dataset.type) { readForm(); form.type = t.dataset.type; renderCart(); }
  else if ('close' in t.dataset) closeSheet();
});

load().catch(() => toast('Menyuni yuklab bo\'lmadi'));
