import { useEffect, useMemo, useState } from 'react';
import { CATEGORIES, PRODUCTS } from './products.js';
import Admin from './Admin.jsx';
import { CURRENCY, MANAGER_USERNAME, SHOP_NAME } from './config.js';

const tg = window.Telegram?.WebApp;
const fmt = (n) => n.toLocaleString('ru-RU').replace(/ /g, ' ') + ' ' + CURRENCY;
const haptic = (t = 'light') => { try { tg?.HapticFeedback?.impactOccurred(t); } catch {} };
const img = (f) => `./img/${f}`;

function useCart() {
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cart') || '{}'); } catch { return {}; }
  });
  useEffect(() => { try { localStorage.setItem('cart', JSON.stringify(cart)); } catch {} }, [cart]);
  const change = (id, d) => {
    haptic();
    setCart((c) => {
      const q = (c[id] || 0) + d;
      const n = { ...c };
      if (q <= 0) delete n[id]; else n[id] = q;
      return n;
    });
  };
  return [cart, change, () => setCart({})];
}

function Price({ p }) {
  return (
    <div className="price">
      <b>{fmt(p.price)}</b>
      {p.oldPrice && <s>{fmt(p.oldPrice)}</s>}
    </div>
  );
}

function Qty({ q, onChange, big }) {
  return (
    <div className={'qty' + (big ? ' big' : '')}>
      <button onClick={() => onChange(-1)} aria-label="Kamaytirish">−</button>
      <span>{q}</span>
      <button onClick={() => onChange(1)} aria-label="Ko'paytirish">+</button>
    </div>
  );
}

function Card({ p, q, onChange, onOpen }) {
  const disc = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  return (
    <div className="card">
      <div className="thumb" onClick={() => onOpen(p)}>
        <img src={img(p.img)} alt={p.name} loading="lazy" />
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
        {q ? <Qty q={q} onChange={(d) => onChange(p.id, d)} /> : (
          <button className="add" onClick={() => onChange(p.id, 1)}>Savatga</button>
        )}
      </div>
    </div>
  );
}

function Sheet({ onClose, children }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="Yopish">✕</button>
        {children}
      </div>
    </div>
  );
}

function Detail({ p, q, onChange, onClose }) {
  return (
    <Sheet onClose={onClose}>
      <div className="dimg"><img src={img(p.img)} alt={p.name} /></div>
      <h2>{p.name}</h2>
      <div className="size">{p.size}</div>
      <p className="desc">{p.desc}</p>
      <div className="drow">
        <Price p={p} />
        {q ? <Qty big q={q} onChange={(d) => onChange(p.id, d)} /> : (
          <button className="add big" onClick={() => onChange(p.id, 1)}>Savatga qo'shish</button>
        )}
      </div>
    </Sheet>
  );
}

function Checkout({ items, total, onChange, onClose, onDone }) {
  const [step, setStep] = useState('cart');
  const [f, setF] = useState(() => {
    const u = tg?.initDataUnsafe?.user;
    return { name: [u?.first_name, u?.last_name].filter(Boolean).join(' '), phone: '', address: '', note: '' };
  });
  const ok = f.name.trim() && f.phone.replace(/\D/g, '').length >= 9 && f.address.trim();

  const text = () =>
    `🛒 Yangi buyurtma — ${SHOP_NAME}\n\n` +
    items.map((i, n) => `${n + 1}. ${i.name} (${i.size}) × ${i.q} = ${fmt(i.price * i.q)}`).join('\n') +
    `\n\n💰 Jami: ${fmt(total)}\n\n👤 ${f.name}\n📞 ${f.phone}\n📍 ${f.address}` +
    (f.note ? `\n💬 ${f.note}` : '');

  const submit = () => {
    const msg = text();
    haptic('medium');
    if (MANAGER_USERNAME) {
      const url = `https://t.me/${MANAGER_USERNAME}?text=${encodeURIComponent(msg)}`;
      tg?.openTelegramLink ? tg.openTelegramLink(url) : window.open(url, '_blank');
    } else {
      try { tg?.sendData?.(JSON.stringify({ items, total, ...f })); } catch {}
    }
    setStep('done');
  };

  if (step === 'done') {
    return (
      <Sheet onClose={onClose}>
        <div className="done">
          <div className="big-emoji">✅</div>
          <h2>Buyurtma qabul qilindi!</h2>
          <p className="desc">Tez orada siz bilan bog'lanamiz. Xaridingiz uchun rahmat!</p>
          <button className="add big" onClick={() => { onDone(); onClose(); }}>Yopish</button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet onClose={onClose}>
      <h2>{step === 'cart' ? '🛒 Savat' : '📋 Buyurtma'}</h2>
      {items.length === 0 ? <p className="desc">Savat bo'sh</p> : step === 'cart' ? (
        <>
          {items.map((i) => (
            <div className="crow" key={i.id}>
              <img src={img(i.img)} alt="" />
              <div className="cinfo">
                <div className="name">{i.name}</div>
                <div className="size">{i.size} · {fmt(i.price)}</div>
                <Qty q={i.q} onChange={(d) => onChange(i.id, d)} />
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
          <button className="add big wide" disabled={!ok} onClick={submit}>Buyurtma berish</button>
          <button className="link" onClick={() => setStep('cart')}>← Savatga qaytish</button>
        </>
      )}
    </Sheet>
  );
}

export default function App() {
  const [overrides, setOverrides] = useState({});
  useEffect(() => { fetch('/api/products').then((r) => r.json()).then(setOverrides).catch(() => {}); }, []);
  const isAdmin = location.pathname.replace(/\/$/, '').endsWith('/admin') || location.hash === '#admin';
  const products = useMemo(() => PRODUCTS.filter((p) => !overrides[p.id]?.hidden).map((p) => {
    const o = overrides[p.id]; return o ? { ...p, price: o.price, oldPrice: o.oldPrice || undefined } : p; }), [overrides]);
  const [cat, setCat] = useState('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [cart, change, clear] = useCart();

  const list = useMemo(() => products.filter((p) =>
    (cat === 'all' || p.cat === cat) && p.name.toLowerCase().includes(query.trim().toLowerCase())), [cat, query, products]);

  const items = products.filter((p) => cart[p.id]).map((p) => ({ ...p, q: cart[p.id] }));
  const count = items.reduce((s, i) => s + i.q, 0);
  const total = items.reduce((s, i) => s + i.q * i.price, 0);

  if (isAdmin) return <Admin overrides={overrides} onSaved={setOverrides} />;

  return (
    <div className="app">
      <header>
        <div className="top">
          <h1>{SHOP_NAME}</h1>
          <button className="cartbtn" onClick={() => setShowCart(true)} aria-label="Savat">
            🛒{count > 0 && <i>{count}</i>}
          </button>
        </div>
        <input className="search" placeholder="🔍 Mahsulot qidirish..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="cats">
          {CATEGORIES.map((c) => (
            <button key={c.id} className={c.id === cat ? 'on' : ''} onClick={() => setCat(c.id)}>{c.icon} {c.name}</button>
          ))}
        </div>
      </header>

      <main>
        {list.length === 0 ? <p className="empty">Hech narsa topilmadi 😕</p> : (
          <div className="grid">
            {list.map((p) => <Card key={p.id} p={p} q={cart[p.id]} onChange={change} onOpen={setOpen} />)}
          </div>
        )}
        <p className="demo">* Narxlar demo — keyinroq yangilanadi</p>
      </main>

      {count > 0 && !showCart && (
        <button className="floatcart" onClick={() => setShowCart(true)}>
          <span>🛒 Savat · {count} ta</span><b>{fmt(total)}</b>
        </button>
      )}

      {open && <Detail p={open} q={cart[open.id]} onChange={change} onClose={() => setOpen(null)} />}
      {showCart && <Checkout items={items} total={total} onChange={change} onClose={() => setShowCart(false)} onDone={clear} />}
    </div>
  );
}
