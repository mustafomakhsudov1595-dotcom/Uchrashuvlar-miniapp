import { useEffect, useMemo, useState } from 'react';
import { CATEGORIES, PRODUCTS } from './products.js';
import { CURRENCY, INFO, SHOP_NAME } from './config.js';

const tg = window.Telegram?.WebApp;
const fmt = (n) => Number(n).toLocaleString('ru-RU').replace(/ /g, ' ') + ' ' + CURRENCY;
const haptic = (t = 'light') => { try { tg?.HapticFeedback?.impactOccurred(t); } catch {} };
const img = (f) => `./img/${f}`;
const ls = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

function useCart() {
  const [cart, setCart] = useState(() => ls.get('cart', {}));
  useEffect(() => ls.set('cart', cart), [cart]);
  const change = (id, d) => {
    haptic();
    setCart((c) => {
      const q = (c[id] || 0) + d, n = { ...c };
      if (q <= 0) delete n[id]; else n[id] = q;
      return n;
    });
  };
  return [cart, change, () => setCart({})];
}

const Price = ({ p }) => (
  <div className="price"><b>{fmt(p.price)}</b>{p.oldPrice && <s>{fmt(p.oldPrice)}</s>}</div>
);

const Qty = ({ q, onChange, big }) => (
  <div className={'qty' + (big ? ' big' : '')}>
    <button onClick={() => onChange(-1)} aria-label="Kamaytirish">−</button>
    <span>{q}</span>
    <button onClick={() => onChange(1)} aria-label="Ko'paytirish">+</button>
  </div>
);

const Pic = ({ p, cls = '' }) => p.img
  ? <img src={img(p.img)} alt={p.name} loading="lazy" />
  : <div className={'noimg ' + cls}>💡<span>{p.size}</span></div>;

function Card({ p, q, onChange, onOpen }) {
  const disc = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  return (
    <div className="card">
      <div className="thumb" onClick={() => onOpen(p)}>
        <Pic p={p} />
        <div className="badges">
          {disc > 0 && <span className="badge red">-{disc}%</span>}
          {p.hit && <span className="badge orange">Hit</span>}
          {p.isNew && <span className="badge green">Yangi</span>}
        </div>
      </div>
      <div className="info">
        <div className="name" onClick={() => onOpen(p)}>{p.name}</div>
        <div className="size">{p.size}</div>
        <Price p={p} />
        {q ? <Qty q={q} onChange={(d) => onChange(p.id, d)} /> : <button className="add" onClick={() => onChange(p.id, 1)}>Savatga</button>}
      </div>
    </div>
  );
}

function Detail({ p, q, onChange, onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="Yopish">✕</button>
        <div className="dimg"><Pic p={p} /></div>
        <h2>{p.name}</h2>
        <div className="size">{p.size}</div>
        <p className="desc">{p.desc}</p>
        <div className="drow">
          <Price p={p} />
          {q ? <Qty big q={q} onChange={(d) => onChange(p.id, d)} /> : <button className="add big" onClick={() => onChange(p.id, 1)}>Savatga qo'shish</button>}
        </div>
      </div>
    </div>
  );
}

function Grid({ list, cart, change, setOpen }) {
  if (!list.length) return <p className="empty">Hech narsa topilmadi 😕</p>;
  return <div className="grid">{list.map((p) => <Card key={p.id} p={p} q={cart[p.id]} onChange={change} onOpen={setOpen} />)}</div>;
}

/* ---------- Bosh ---------- */
function Home({ products, cart, change, setOpen, cat, setCat }) {
  const [query, setQuery] = useState('');
  const list = products.filter((p) => (cat === 'all' || p.cat === cat) && p.name.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <>
      <header>
        <h1>{SHOP_NAME}</h1>
        <input className="search" placeholder="🔍 Mahsulot qidirish..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="cats">
          {[{ id: 'all', name: 'Hammasi', icon: '✨' }, ...CATEGORIES].map((c) => (
            <button key={c.id} className={c.id === cat ? 'on' : ''} onClick={() => setCat(c.id)}>{c.icon} {c.name}</button>
          ))}
        </div>
      </header>
      <Grid list={list} cart={cart} change={change} setOpen={setOpen} />
    </>
  );
}

/* ---------- Kategoriyalar ---------- */
function Categories({ products, onPick }) {
  return (
    <>
      <header><h1>Kategoriyalar</h1></header>
      <div className="cgrid">
        {CATEGORIES.map((c) => {
          const items = products.filter((p) => p.cat === c.id);
          if (!items.length) return null;
          const pic = items.find((p) => p.img);
          return (
            <button className="ctile" key={c.id} onClick={() => onPick(c.id)}>
              <div className="cpic">{pic ? <img src={img(pic.img)} alt="" loading="lazy" /> : <span>{c.icon}</span>}</div>
              <div className="cname">{c.icon} {c.name}</div>
              <div className="ccount">{items.length} ta mahsulot</div>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ---------- Savat ---------- */
function CartPage({ items, total, change, clear, goHome, goOrders }) {
  const saved = ls.get('profile', {});
  const [step, setStep] = useState('cart');
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [f, setF] = useState(() => {
    const u = tg?.initDataUnsafe?.user;
    return { name: saved.name || [u?.first_name, u?.last_name].filter(Boolean).join(' '), phone: saved.phone || '', address: saved.address || '', note: '' };
  });
  const ok = f.name.trim() && f.phone.replace(/\D/g, '').length >= 9 && f.address.trim();

  const submit = async () => {
    setBusy(true); setErr(''); haptic('medium');
    try {
      const r = await fetch('/api/order', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-init-data': tg?.initData || '' },
        body: JSON.stringify({ ...f, items: items.map((i) => ({ id: i.id, q: i.q })) }),
      });
      if (!r.ok) throw new Error();
      const d = await r.json();
      ls.set('profile', { name: f.name, phone: f.phone, address: f.address });
      setDone(d.num); clear();
    } catch { setErr("Yuborib bo'lmadi, qayta urinib ko'ring"); }
    setBusy(false);
  };

  if (done) return (
    <div className="page done">
      <div className="big-emoji">✅</div>
      <h2>Buyurtma qabul qilindi!</h2>
      <p className="desc">Buyurtma raqami: <b>#{done}</b><br />Tez orada siz bilan bog'lanamiz. Xaridingiz uchun rahmat!</p>
      <button className="add big wide" onClick={goOrders}>📦 Buyurtmalarim</button>
      <button className="link" onClick={goHome}>Xaridni davom ettirish</button>
    </div>
  );

  if (!items.length) return (
    <div className="page done">
      <div className="big-emoji">🛒</div>
      <h2>Savat bo'sh</h2>
      <p className="desc">Mahsulotlarni tanlab, savatga qo'shing.</p>
      <button className="add big wide" onClick={goHome}>Xaridni boshlash</button>
    </div>
  );

  return (
    <div className="page">
      <h1>{step === 'cart' ? '🛒 Savat' : '📋 Buyurtma'}</h1>
      {step === 'cart' ? (
        <>
          {items.map((i) => (
            <div className="crow" key={i.id}>
              {i.img ? <img src={img(i.img)} alt="" /> : <div className="noimg sm">💡</div>}
              <div className="cinfo">
                <div className="name">{i.name}</div>
                <div className="size">{i.size} · {fmt(i.price)}</div>
                <Qty q={i.q} onChange={(d) => change(i.id, d)} />
              </div>
              <b className="csum">{fmt(i.price * i.q)}</b>
            </div>
          ))}
          <div className="total"><span>Jami:</span><b>{fmt(total)}</b></div>
          <button className="add big wide" onClick={() => setStep('form')}>Rasmiylashtirish</button>
        </>
      ) : (
        <>
          <label>Ismingiz<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ism familiya" /></label>
          <label>Telefon<input type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+998 90 123 45 67" /></label>
          <label>Manzil<input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} placeholder="Shahar, ko'cha, uy" /></label>
          <label>Izoh (ixtiyoriy)<input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
          <div className="total"><span>Jami:</span><b>{fmt(total)}</b></div>
          <button className="add big wide" disabled={!ok || busy} onClick={submit}>{busy ? 'Yuborilmoqda...' : 'Buyurtma berish'}</button>
          {err && <p className="desc" style={{ color: '#ef4444', textAlign: 'center' }}>{err}</p>}
          <button className="link" onClick={() => setStep('cart')}>← Savatga qaytish</button>
        </>
      )}
    </div>
  );
}

/* ---------- Buyurtmalarim ---------- */
const ST = { new: ['🆕 Qabul qilindi', 'orange'], done: ['✅ Bajarildi', 'green'], cancel: ['❌ Bekor qilindi', 'red'] };
function Orders() {
  const [orders, setOrders] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!tg?.initData) { setErr('tg'); return; }
    fetch('/api/myorders', { headers: { 'x-init-data': tg.initData } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setOrders(d.orders))
      .catch(() => setErr('fail'));
  }, []);
  return (
    <div className="page">
      <h1>📦 Buyurtmalarim</h1>
      {err === 'tg' && <p className="desc">Buyurtmalaringizni ko'rish uchun do'konni Telegram ichida oching.</p>}
      {err === 'fail' && <p className="desc">Yuklab bo'lmadi, keyinroq urinib ko'ring.</p>}
      {!err && orders === null && <p className="desc">Yuklanmoqda...</p>}
      {orders?.length === 0 && <p className="empty">Hali buyurtmalar yo'q 🛍️</p>}
      {orders?.map((o) => {
        const [label, color] = ST[o.status] || ST.new;
        return (
          <div className="order" key={o.num}>
            <div className="ohead"><b>#{o.num}</b><span className={'tag ' + color}>{label}</span>
              <span className="size">{new Date(o.ts).toLocaleDateString('ru-RU')}</span></div>
            <ul>{o.items.map((i) => <li key={i.id}>{i.name} × {i.q}</li>)}</ul>
            <div className="otot">Jami: <b>{fmt(o.total)}</b></div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Info ---------- */
function Info() {
  const rows = [
    ['📞', 'Telefon', INFO.phone && <a href={'tel:' + INFO.phone.replace(/\s/g, '')}>{INFO.phone}</a>],
    ['✈️', 'Telegram', INFO.telegram && <a href={'https://t.me/' + INFO.telegram} onClick={(e) => { if (tg?.openTelegramLink) { e.preventDefault(); tg.openTelegramLink('https://t.me/' + INFO.telegram); } }}>@{INFO.telegram}</a>],
    ['📍', 'Manzil', INFO.address],
    ['🕘', 'Ish vaqti', INFO.hours],
  ].filter((r) => r[2]);
  return (
    <div className="page">
      <h1>ℹ️ Ma'lumot</h1>
      <div className="infocard"><h3>🏪 {SHOP_NAME}</h3><p>{INFO.about}</p></div>
      {rows.length > 0 && <div className="infocard">{rows.map(([i, t, v]) => <div className="irow" key={t}><span>{i} {t}</span><b>{v}</b></div>)}</div>}
      <div className="infocard"><h3>🚚 Yetkazib berish</h3><p>{INFO.delivery}</p></div>
      <div className="infocard"><h3>💳 To'lov</h3><p>{INFO.payment}</p></div>
    </div>
  );
}

/* ---------- Asosiy ---------- */
const TABS = [['home', '🏠', 'Bosh'], ['cats', '🗂️', 'Kategoriya'], ['cart', '🛒', 'Savat'], ['orders', '📦', 'Buyurtmalar'], ['info', 'ℹ️', 'Info']];

export default function App() {
  const [tab, setTab] = useState('home');
  const [cat, setCat] = useState('all');
  const [open, setOpen] = useState(null);
  const [cart, change, clear] = useCart();
  const [overrides, setOverrides] = useState({});
  useEffect(() => { fetch('/api/products').then((r) => r.json()).then(setOverrides).catch(() => {}); }, []);

  const products = useMemo(() => PRODUCTS.filter((p) => !(overrides[p.id]?.hidden ?? p.hidden)).map((p) => {
    const o = overrides[p.id]; return o ? { ...p, price: o.price, oldPrice: o.oldPrice || undefined } : p;
  }), [overrides]);
  const items = products.filter((p) => cart[p.id]).map((p) => ({ ...p, q: cart[p.id] }));
  const count = items.reduce((s, i) => s + i.q, 0);
  const total = items.reduce((s, i) => s + i.q * i.price, 0);

  const go = (t) => { setTab(t); window.scrollTo(0, 0); };

  return (
    <div className="app">
      {tab === 'home' && <Home products={products} cart={cart} change={change} setOpen={setOpen} cat={cat} setCat={setCat} />}
      {tab === 'cats' && <Categories products={products} onPick={(c) => { setCat(c); go('home'); }} />}
      {tab === 'cart' && <CartPage items={items} total={total} change={change} clear={clear} goHome={() => go('home')} goOrders={() => go('orders')} />}
      {tab === 'orders' && <Orders />}
      {tab === 'info' && <Info />}

      {count > 0 && tab !== 'cart' && (
        <button className="floatcart" onClick={() => go('cart')}><span>🛒 Savat · {count} ta</span><b>{fmt(total)}</b></button>
      )}

      <nav className="tabbar">
        {TABS.map(([id, icon, name]) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => go(id)}>
            <span className="ti">{icon}{id === 'cart' && count > 0 && <i>{count}</i>}</span>{name}
          </button>
        ))}
      </nav>

      {open && <Detail p={open} q={cart[open.id]} onChange={change} onClose={() => setOpen(null)} />}
    </div>
  );
}
