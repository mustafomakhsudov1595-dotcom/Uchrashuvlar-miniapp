const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); try { tg.setHeaderColor('#FFD43B'); tg.setBackgroundColor('#FFF3C4'); } catch {} }

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + " so'm";
const haptic = (t = 'light') => { try { tg?.HapticFeedback?.impactOccurred(t); } catch {} };
const STATUS = { new: '🆕 Yangi', accepted: '👨‍🍳 Tayyorlanmoqda', delivering: '🛵 Yo\'lda', done: '✅ Yetkazildi', cancelled: '❌ Bekor qilindi' };

let menu = [], settings = {};
let cart = {}, promo = null;
let page = 'home', cat = 'all', q = '';
let lastOrder = null;
let form = { name: tg?.initDataUnsafe?.user?.first_name || '', phone: '', address: '', type: 'delivery' };
try { Object.assign(form, JSON.parse(localStorage.getItem('bz_form') || '{}')); } catch {}

const items = () => menu.flatMap((c) => c.items);
const find = (id) => items().find((i) => i.id === id);
const subtotal = () => Object.entries(cart).reduce((s, [id, n]) => s + (find(id)?.price || 0) * n, 0);
const discount = () => (promo ? Math.round((subtotal() * promo.percent) / 100 / 100) * 100 : 0);
const count = () => Object.values(cart).reduce((a, b) => a + b, 0);

function toast(t) { const el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (el.hidden = true), 2600); }
const post = async (url, body) => { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return [r, await r.json()]; };

/* ---------- Mahsulot kartochkasi ---------- */
function card(i) {
  const n = cart[i.id] || 0;
  const c = menu.find((x) => x.items.some((y) => y.id === i.id));
  const ctrl = !i.available ? '<span class="soldout">Tugagan</span>'
    : n ? `<div class="qty"><button data-dec="${i.id}">−</button><b>${n}</b><button data-inc="${i.id}">+</button></div>`
    : `<button class="add" data-inc="${i.id}">+ Qo'shish</button>`;
  const ph = i.img ? `<img src="${esc(i.img)}" alt="${esc(i.name)}" loading="lazy">` : `<div class="noimg">${esc(c?.emoji || '🍽')}</div>`;
  return `<div class="item card ${i.available ? '' : 'off'} ${n ? 'sel' : ''}" data-card="${i.id}"><div class="ph">${ph}<span class="price">${fmt(i.price)}</span>${n ? `<span class="badge">${n}</span>` : ''}</div><div class="body"><div class="n">${esc(i.name)}</div>${i.desc ? `<div class="d">${esc(i.desc)}</div>` : ''}<div class="ctl">${ctrl}</div></div></div>`;
}
function change(id, d) {
  const n = Math.max(0, Math.min(50, (cart[id] || 0) + d));
  if (n) cart[id] = n; else delete cart[id];
  haptic();
  if (page === 'cart') { readForm(); renderCartPage(); }
  else document.querySelectorAll(`[data-card="${id}"]`).forEach((el) => { el.outerHTML = card(find(id)); });
  updateChrome();
}

/* ---------- Sahifalar ---------- */
function home() {
  const popular = menu.map((c) => c.items.find((i) => i.available)).filter(Boolean);
  return `
  ${settings.open === false ? '<div class="closed card">Hozir buyurtma qabul qilinmayapti 🌙</div>' : ''}
  <section class="hero">
    <span class="float" style="right:14px;bottom:70px;--r:8deg">🌭</span><span class="float" style="right:70px;bottom:14px;--r:-8deg;animation-delay:.6s">🍔</span>
    <img class="logo" src="/img/logo.png" alt="Birzumda Xot Dog">
    <span class="pill tag">🔥 Yetkazib berish bepul</span>
    <h1>Mazali xot&#8209;dog — bir zumda!</h1>
    <p>Xot-dog, lavash, burger, KFC va kofe</p>
    <button class="btn yellow" data-go="catalog">Menyuni ochish 🍽</button>
  </section>
  <div class="facts">
    <div class="card fact"><b>🛵</b>Dostavka<br>bepul</div>
    <div class="card fact"><b>🕘</b>${esc(settings.hours || '09:00 – 00:00')}</div>
    <div class="card fact"><b>🎟</b>Promokod<br>bilan chegirma</div>
  </div>
  <h2 class="sec">🍴 Kategoriyalar</h2>
  <div class="cats">${menu.map((c) => `<button class="card cat-card" data-cat="${esc(c.id)}">${c.img ? `<img src="${esc(c.img)}" alt="" loading="lazy">` : `<div class="em">${esc(c.emoji)}</div>`}<div class="lbl"><b>${esc(c.name)}</b><span>${c.items.length} ta mahsulot</span></div></button>`).join('')}</div>
  <h2 class="sec">⭐ Mashhur taomlar</h2>
  <div class="rail">${popular.map(card).join('')}</div>
  <img class="menu-img" src="/img/banner.jpg" alt="Mazali Fast Food" style="margin-top:14px">`;
}

function catalog() {
  return `<input class="search" id="search" placeholder="🔍 Taom qidirish..." value="${esc(q)}">
  <div class="chips"><button class="chip ${cat === 'all' ? 'on' : ''}" data-cat="all">Hammasi</button>${menu.map((c) => `<button class="chip ${cat === c.id ? 'on' : ''}" data-cat="${esc(c.id)}">${esc(c.emoji)} ${esc(c.name)}</button>`).join('')}</div>
  <div id="catItems">${catItems()}</div>`;
}
function catItems() {
  const term = q.trim().toLowerCase();
  const out = menu.filter((c) => cat === 'all' || c.id === cat).map((c) => {
    const list = c.items.filter((i) => !term || i.name.toLowerCase().includes(term));
    return list.length ? `<h2 class="sec">${esc(c.emoji)} ${esc(c.name)}</h2><div class="items">${list.map(card).join('')}</div>` : '';
  }).join('');
  return out || '<div class="empty"><span class="big">🔎</span>Hech narsa topilmadi</div>';
}

function totals() {
  const s = subtotal(), d = discount();
  return `<div class="sum"><span>Taomlar</span><span>${fmt(s)}</span></div>
    ${promo ? `<div class="sum disc"><span>🎟 ${esc(promo.code)} (−${promo.percent}%)</span><span>−${fmt(d)}</span></div>` : ''}
    <div class="sum"><span>Yetkazib berish</span><span>Bepul 🛵</span></div>
    <div class="sum total"><span>To'lash</span><span>${fmt(s - d)}</span></div>`;
}
function cartPage() {
  if (!count()) return `<div class="empty"><span class="big">🛒</span>Savat hozircha bo'sh<br><br><button class="btn yellow" data-go="catalog">Menyuga o'tish</button></div>`;
  const rows = Object.entries(cart).map(([id, n]) => { const i = find(id); return `<div class="card row">${i.img ? `<img src="${esc(i.img)}" alt="">` : '<div class="noimg">🍽</div>'}<div class="t"><b>${esc(i.name)}</b><span>${fmt(i.price)}</span></div><div class="qty"><button data-dec="${id}">−</button><b>${n}</b><button data-inc="${id}">+</button></div></div>`; }).join('');
  return `<h2 class="sec" style="margin-top:6px">🛒 Savat</h2>${rows}
    <div class="promo"><input class="f" id="promoIn" placeholder="🎟 Promokod" maxlength="20" value="${esc(promo ? promo.code : '')}"><button class="btn yellow" id="promoBtn">Qo'llash</button></div>
    <div class="msg ${promo ? 'ok' : ''}" id="promoMsg">${promo ? `✅ Promokod qo'llandi: −${promo.percent}%` : ''}</div>
    <div class="card" style="padding:14px;margin-top:8px">${totals()}</div>
    <div class="seg"><button data-type="delivery" class="${form.type === 'delivery' ? 'on' : ''}">🛵 Yetkazib berish</button><button data-type="pickup" class="${form.type === 'pickup' ? 'on' : ''}">🏃 Olib ketaman</button></div>
    <input class="f" id="fName" placeholder="Ismingiz" value="${esc(form.name)}" maxlength="60" autocomplete="name">
    <input class="f" id="fPhone" type="tel" placeholder="Telefon: 90 123 45 67" value="${esc(form.phone)}" maxlength="25" autocomplete="tel">
    ${form.type === 'delivery' ? `<input class="f" id="fAddr" placeholder="📍 Manzil (ko'cha, uy, mo'ljal)" value="${esc(form.address)}" maxlength="200" autocomplete="street-address">` : ''}
    <textarea class="f" id="fComm" rows="2" placeholder="💬 Izoh (ixtiyoriy)" maxlength="300"></textarea>
    <button class="btn" id="orderBtn" style="margin-top:16px">Buyurtma berish · ${fmt(subtotal() - discount())}</button>`;
}
function renderCartPage() { $('view').innerHTML = cartPage(); }

function ordersPage() { return `<h2 class="sec" style="margin-top:6px">📦 Buyurtmalarim</h2><div id="ordersBox"><div class="empty"><span class="big">⏳</span>Yuklanmoqda...</div></div>`; }
async function loadOrders() {
  const box = $('ordersBox'); if (!box) return;
  const [r, d] = await post('/api/my-orders', { initData: tg?.initData || '' }).catch(() => [{ ok: false }, {}]);
  if (page !== 'orders') return;
  if (!r.ok) { box.innerHTML = `<div class="empty"><span class="big">🔒</span>${esc(d.error || 'Buyurtmalarni ko\'rish uchun ilovani Telegram ichida oching')}</div>`; return; }
  box.innerHTML = (lastOrder ? `<div class="card success"><span class="big">🎉</span>Buyurtma #${lastOrder.id} qabul qilindi!<div style="font:700 15px Nunito">Tez orada siz bilan bog'lanamiz</div></div>` : '') +
    (d.orders.length ? d.orders.map((o) => `<div class="card order"><div class="top"><span>#${o.id}</span><span class="st ${o.status}">${STATUS[o.status]}</span></div>
      <div style="color:var(--muted);font-size:13px">${new Date(o.createdAt).toLocaleString('uz-UZ')}</div>
      <ul>${o.items.map((i) => `<li>${esc(i.name)} × ${i.qty}</li>`).join('')}</ul>
      <div class="tot"><span>Jami</span><span>${fmt(o.total)}</span></div><button class="btn yellow" data-repeat="${o.id}">🔁 Qayta buyurtma</button></div>`).join('')
      : '<div class="empty"><span class="big">🍽</span>Hali buyurtma bermagansiz</div>');
  window.__orders = d.orders; lastOrder = null;
}

function infoPage() {
  const tel = String(settings.phone || '').replace(/\D/g, '');
  return `<img class="info-logo" src="/img/logo.png" alt=""><h2 class="sec" style="justify-content:center;margin-top:0">Birzumda Xot Dog</h2>
  <a class="card info-row" href="tel:+998${tel}"><span class="ic">📞</span><div><small>Buyurtma uchun qo'ng'iroq</small>${esc(settings.phone || '')}</div></a>
  <div class="card info-row"><span class="ic">📍</span><div><small>Manzil</small>${esc(settings.address || '')}</div></div>
  <div class="card info-row"><span class="ic">🕘</span><div><small>Ish vaqti</small>${esc(settings.hours || '')}</div></div>
  <div class="card info-row"><span class="ic">🛵</span><div><small>Yetkazib berish</small>Bepul!</div></div>
  <a class="card info-row" data-link="https://instagram.com/birzumdaxotdog_n1" href="https://instagram.com/birzumdaxotdog_n1"><span class="ic">📸</span><div><small>Instagram</small>@birzumdaxotdog_n1</div></a>
  <h2 class="sec">📋 Menyu</h2><img class="menu-img" src="/img/menu.jpg" alt="Menyu" loading="lazy">`;
}

/* ---------- Umumiy ---------- */
const TABS = [['home', '🏠', 'Asosiy'], ['catalog', '🍔', 'Katalog'], ['cart', '🛒', 'Savat'], ['orders', '📦', 'Buyurtmalar'], ['info', 'ℹ️', 'Ma\'lumot']];
function updateChrome() {
  $('tabbar').innerHTML = TABS.map(([k, ic, l]) => `<button class="tab ${page === k ? 'on' : ''}" data-go="${k}"><i>${ic}</i>${l}${k === 'cart' && count() ? `<span class="dot">${count()}</span>` : ''}</button>`).join('');
  const b = $('cartbar');
  b.hidden = !count() || page === 'cart';
  if (!b.hidden) b.innerHTML = `<span>🛒 Savat · ${count()} ta</span><span>${fmt(subtotal() - discount())}</span>`;
}
function go(p) {
  page = p;
  $('view').innerHTML = { home, catalog, cart: cartPage, orders: ordersPage, info: infoPage }[p]();
  window.scrollTo(0, 0); updateChrome();
  if (p === 'orders') loadOrders();
}

async function applyPromo() {
  const code = $('promoIn').value.trim(); if (!code) return;
  readForm();
  const [r, d] = await post('/api/promo', { code, initData: tg?.initData || '' });
  if (r.ok) { promo = d; haptic('medium'); renderCartPage(); updateChrome(); }
  else { promo = null; renderCartPage(); updateChrome(); $('promoIn').value = code; $('promoMsg').className = 'msg err'; $('promoMsg').textContent = '❌ ' + d.error; }
}
function readForm() {
  if (!$('fName')) return;
  form.name = $('fName').value.trim(); form.phone = $('fPhone').value.trim();
  if ($('fAddr')) form.address = $('fAddr').value.trim();
  try { localStorage.setItem('bz_form', JSON.stringify({ name: form.name, phone: form.phone, address: form.address, type: form.type })); } catch {}
}
async function order() {
  readForm();
  const comment = $('fComm')?.value.trim() || '';
  if (settings.open === false) return toast('Hozir buyurtma qabul qilinmayapti');
  if (!form.name) return toast('Ismingizni kiriting');
  if (form.phone.replace(/\D/g, '').length < 9) return toast('Telefon raqamni to\'g\'ri kiriting');
  if (form.type === 'delivery' && form.address.length < 3) return toast('Manzilni kiriting');
  const btn = $('orderBtn'); btn.disabled = true; btn.textContent = 'Yuborilmoqda...';
  try {
    const [r, d] = await post('/api/order', { initData: tg?.initData || '', items: Object.entries(cart).map(([id, qty]) => ({ id, qty })), promo: promo?.code || '', ...form, comment });
    if (!r.ok) throw new Error(d.error || 'Xatolik');
    try { tg?.HapticFeedback?.notificationOccurred('success'); } catch {}
    cart = {}; promo = null; lastOrder = { id: d.id }; go('orders');
  } catch (e) { toast(e.message); btn.disabled = false; btn.textContent = 'Buyurtma berish'; }
}

document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-link]');
  if (link) { e.preventDefault(); tg?.openLink ? tg.openLink(link.dataset.link) : window.open(link.dataset.link, '_blank'); return; }
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.inc) change(t.dataset.inc, 1);
  else if (t.dataset.dec) change(t.dataset.dec, -1);
  else if (t.dataset.go) { readForm(); go(t.dataset.go); }
  else if (t.id === 'cartbar') go('cart');
  else if (t.dataset.cat) { cat = t.dataset.cat; q = ''; go('catalog'); }
  else if (t.id === 'promoBtn') applyPromo();
  else if (t.id === 'orderBtn') order();
  else if (t.dataset.type) { readForm(); form.type = t.dataset.type; renderCartPage(); }
  else if (t.dataset.repeat) {
    const o = (window.__orders || []).find((x) => x.id === Number(t.dataset.repeat)); if (!o) return;
    cart = {}; for (const i of o.items) if (find(i.id)?.available) cart[i.id] = i.qty;
    haptic('medium'); go('cart');
  }
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'search') { q = e.target.value; $('catItems').innerHTML = catItems(); }
});

(async () => {
  try {
    const d = await (await fetch('/api/menu')).json();
    menu = d.menu; settings = d.settings; go('home');
  } catch { $('view').innerHTML = '<div class="empty"><span class="big">😕</span>Menyuni yuklab bo\'lmadi.<br>Qayta urinib ko\'ring.</div>'; }
})();
