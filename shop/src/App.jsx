import { useEffect, useMemo, useState } from 'react';
import { CATEGORIES, PRODUCTS } from './products.js';
import { CURRENCY, INFO, SHOP_NAME } from './config.js';
import { buildCatalog } from './lib/pricing.js';
import { IBack, IBox, ICart, IChev, ICheck, IClose, IGrid, IHome, IInfo, IMinus, IPlus, ISearch } from './Icons.jsx';

const tg = window.Telegram?.WebApp;
const fmt = (n) => Number(n).toLocaleString('ru-RU').replace(/ /g, ' ') + ' ' + CURRENCY;
const haptic = (t = 'light') => { try { tg?.HapticFeedback?.impactOccurred(t); } catch {} };
const img = (f) => (f.startsWith('/') || f.startsWith('http') ? f : `./img/${f}`);
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

const Price = ({ p, big }) => (
  <div className={'price' + (big ? ' big' : '')}><b>{fmt(p.price)}</b>{p.oldPrice && <s>{fmt(p.oldPrice)}</s>}</div>
);

const Qty = ({ q, onChange, big }) => (
  <div className={'qty' + (big ? ' big' : '')}>
    <button onClick={() => onChange(-1)} aria-label="Kamaytirish"><IMinus size={16} /></button>
    <span>{q}</span>
    <button onClick={() => onChange(1)} aria-label="Ko'paytirish"><IPlus size={16} /></button>
  </div>
);

function Pic({ p }) {
  const [wide, setWide] = useState(false);
  if (!p.img) return <div className="noimg"><span className="ni">💡</span><b>{p.size}</b></div>;
  return <img className={wide ? 'contain' : ''} src={img(p.img)} alt={p.name} loading="lazy"
    onLoad={(e) => setWide(e.target.naturalWidth / e.target.naturalHeight > 1.15)} />;
}

function Card({ p, q, onChange, onOpen, mini }) {
  const disc = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  const out = p.stock === 0;
  return (
    <div className={'card' + (mini ? ' mini' : '') + (out ? ' soldout' : '')}>
      <div className="thumb" onClick={() => onOpen(p)}>
        <Pic p={p} />
        <div className="badges">
          {disc > 0 && <span className="badge sale">−{disc}%</span>}
          {p.hit && <span className="badge hit">🔥 Hit</span>}
          {p.isNew && <span className="badge new">Yangi</span>}
          {out && <span className="badge out">Tugagan</span>}
          {p.stock > 0 && p.stock <= 5 && <span className="badge low">Oxirgi {p.stock} ta</span>}
        </div>
      </div>
      <div className="info">
        <div className="name" onClick={() => onOpen(p)}>{p.name}</div>
        <div className="size">{p.size}</div>
        <div className="prow"><Price p={p} /></div>
        {out ? <button className="add" disabled>Tugagan</button> : q ? <Qty q={q} onChange={(d) => onChange(p.id, d)} /> : (
          <button className="add" onClick={() => onChange(p.id, 1)}><IPlus size={17} /> Savatga</button>
        )}
      </div>
    </div>
  );
}

function Detail({ p, q, onChange, onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        <button className="close" onClick={onClose} aria-label="Yopish"><IClose size={18} /></button>
        <div className="dimg"><Pic p={p} /></div>
        <div className="dbody">
          <div className="dtags">
            {p.hit && <span className="badge hit">🔥 Hit</span>}
            {p.isNew && <span className="badge new">Yangi</span>}
            <span className="badge plain">{p.size}</span>
          </div>
          <h2>{p.name}</h2>
          <p className="desc">{p.desc}</p>
        </div>
        <div className="dbar">
          <Price p={p} big />
          {p.stock === 0 ? <button className="add big" disabled>Tugagan</button> : q ? <Qty big q={q} onChange={(d) => onChange(p.id, d)} /> : (
            <button className="add big" onClick={() => onChange(p.id, 1)}><IPlus size={18} /> Savatga</button>
          )}
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
const BATT = ['duracell', 'raketa', 'soni'];
const SLIDES = [
  { id: 'sale', t: 'Chegirmalar', s: 'Tanlangan mahsulotlarda maxsus narxlar', cta: 'Ko‘rish', img: 'ariel-pods.jpg', g: ['#4F46E5', '#0EA5E9'] },
  { id: 'batt', t: 'Batareykalar', s: 'Duracell, Raketa, Soni — katta qadoqlar', cta: 'Tanlash', img: 'raketa-aa.jpg', g: ['#F59E0B', '#EF4444'] },
  { id: 'lamp', t: 'LED lampochkalar', s: 'Veral — 5 000 so‘mdan, 2 yil kafolat', cta: 'Ko‘rish', img: 'veral-7w.jpg', g: ['#059669', '#0EA5E9'] },
];
const TITLES = { sale: '🏷️ Chegirmalar', batt: '🔋 Batareykalar', ...Object.fromEntries(CATEGORIES.map((c) => [c.id, `${c.icon} ${c.name}`])) };

function Home({ products, cart, change, setOpen, cat, setCat, count, goCart }) {
  const [query, setQuery] = useState('');
  const user = tg?.initDataUnsafe?.user;
  const q = query.trim().toLowerCase();
  const filtering = cat !== 'all' || q;
  const list = products.filter((p) => {
    const okCat = cat === 'all' || (cat === 'sale' ? p.oldPrice : cat === 'batt' ? BATT.includes(p.cat) : p.cat === cat);
    return okCat && p.name.toLowerCase().includes(q);
  });
  const hits = products.filter((p) => p.hit);

  return (
    <>
      <header className="top">
        <div className="brand">
          <img className="logo" src="./logo.svg" alt="" />
          <div><div className="bname">{SHOP_NAME}</div><div className="hello">{user?.first_name ? `Salom, ${user.first_name} 👋` : 'Xush kelibsiz 👋'}</div></div>
        </div>
        <button className="iconbtn" onClick={goCart} aria-label="Savat"><ICart />{count > 0 && <i className="cbadge">{count}</i>}</button>
      </header>

      <div className="searchbox"><ISearch size={19} /><input placeholder="Mahsulot qidirish..." value={query} onChange={(e) => setQuery(e.target.value)} /></div>

      {!filtering ? (
        <>
          <div className="hero">
            {SLIDES.map((s) => (
              <div className="slide" key={s.id} style={{ background: `linear-gradient(135deg, ${s.g[0]}, ${s.g[1]})` }} onClick={() => setCat(s.id)}>
                <div className="stext">
                  <b>{s.t}</b><span>{s.s}</span>
                  <em>{s.cta} <IChev size={16} /></em>
                </div>
                <img src={img(s.img)} alt="" />
              </div>
            ))}
          </div>

          <div className="cc-row">
            {CATEGORIES.map((c) => (
              <button className="cc" key={c.id} onClick={() => setCat(c.id)}>
                <span className="cc-ic" style={{ background: `linear-gradient(135deg, ${c.c1}, ${c.c2})` }}>{c.icon}</span>
                <span className="cc-n">{c.name}</span>
              </button>
            ))}
          </div>

          {hits.length > 0 && (
            <>
              <div className="sec"><h2>🔥 Ommabop</h2></div>
              <div className="hrow">{hits.map((p) => <Card mini key={p.id} p={p} q={cart[p.id]} onChange={change} onOpen={setOpen} />)}</div>
            </>
          )}
          <div className="sec"><h2>Barcha mahsulotlar</h2><span className="muted">{products.length} ta</span></div>
        </>
      ) : (
        <div className="sec">
          <button className="backchip" onClick={() => { setCat('all'); setQuery(''); }}><IBack size={16} /> Orqaga</button>
          <h2>{q && cat === 'all' ? `“${query}”` : TITLES[cat]}</h2>
          <span className="muted">{list.length} ta</span>
        </div>
      )}
      <Grid list={filtering ? list : products} cart={cart} change={change} setOpen={setOpen} />
    </>
  );
}

/* ---------- Kategoriyalar ---------- */
function Categories({ products, onPick }) {
  return (
    <>
      <header className="ptitle"><h1>Kategoriyalar</h1><p>Kerakli bo‘limni tanlang</p></header>
      <div className="cgrid">
        {CATEGORIES.map((c) => {
          const n = products.filter((p) => p.cat === c.id).length;
          if (!n) return null;
          return (
            <button className="ctile" key={c.id} onClick={() => onPick(c.id)} style={{ background: `linear-gradient(135deg, ${c.c1}, ${c.c2})` }}>
              <span className="cemoji">{c.icon}</span>
              <span className="cname">{c.name}</span>
              <span className="ccount">{n} ta mahsulot <IChev size={13} /></span>
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
  const [code, setCode] = useState('');
  const [promo, setPromo] = useState(null); // {code, discount, label}
  const [perr, setPerr] = useState('');
  const cartKey = items.map((i) => i.id + ':' + i.q + ':' + i.price).join(',');
  const applyPromo = async (c = code) => {
    setPerr('');
    if (!c.trim()) return;
    try {
      const r = await (await fetch('/api/promo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: c, items: items.map((i) => ({ id: i.id, q: i.q })) }) })).json();
      if (r.ok) { setPromo(r); haptic('medium'); } else { setPromo(null); setPerr(r.error || 'Xato'); }
    } catch { setPerr('Tekshirib bo‘lmadi'); }
  };
  useEffect(() => { if (promo) applyPromo(promo.code); /* savat o'zgarsa qayta hisoblaymiz */ }, [cartKey]); // eslint-disable-line
  const discount = promo?.discount || 0;
  const payable = Math.max(0, total - discount);
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
        body: JSON.stringify({ ...f, items: items.map((i) => ({ id: i.id, q: i.q })), promo: promo?.code || '' }),
      });
      if (r.status === 409) { const e = await r.json(); setErr(`“${e.name}” omborda yetarli emas (qoldi: ${e.left} ta)`); setBusy(false); return; }
      if (!r.ok) throw new Error();
      const d = await r.json();
      ls.set('profile', { name: f.name, phone: f.phone, address: f.address });
      setDone(d.num); clear();
    } catch { setErr("Yuborib bo'lmadi, qayta urinib ko'ring"); }
    setBusy(false);
  };

  if (done) return (
    <div className="page done">
      <div className="okring"><ICheck size={44} strokeWidth={2.6} /></div>
      <h2>Buyurtma qabul qilindi!</h2>
      <p className="desc">Buyurtma raqami: <b>#{done}</b><br />Tez orada siz bilan bog'lanamiz. Xaridingiz uchun rahmat!</p>
      <button className="add big wide" onClick={goOrders}>Buyurtmalarim</button>
      <button className="link" onClick={goHome}>Xaridni davom ettirish</button>
    </div>
  );

  if (!items.length) return (
    <div className="page done">
      <div className="okring empty"><ICart size={42} /></div>
      <h2>Savat bo'sh</h2>
      <p className="desc">Mahsulotlarni tanlab, savatga qo'shing.</p>
      <button className="add big wide" onClick={goHome}>Xaridni boshlash</button>
    </div>
  );

  return (
    <div className="page">
      <header className="ptitle"><h1>{step === 'cart' ? 'Savat' : 'Buyurtma'}</h1><p>{step === 'cart' ? `${items.length} xil mahsulot` : 'Ma’lumotlaringizni kiriting'}</p></header>
      {step === 'cart' ? (
        <>
          {items.map((i) => (
            <div className="crow" key={i.id}>
              {i.img ? <img src={img(i.img)} alt="" /> : <div className="noimg sm"><span className="ni">💡</span></div>}
              <div className="cinfo">
                <div className="name">{i.name}</div>
                <div className="size">{i.size} · {fmt(i.price)}</div>
                <Qty q={i.q} onChange={(d) => change(i.id, d)} />
              </div>
              <b className="csum">{fmt(i.price * i.q)}</b>
            </div>
          ))}
          <div className="promo">
            <div className="pfield"><input placeholder="Promokod" value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setPerr(''); }} disabled={!!promo} />
              {promo ? <button onClick={() => { setPromo(null); setCode(''); }}>Bekor</button> : <button onClick={() => applyPromo()}>Qo‘llash</button>}</div>
            {perr && <div className="perr">{perr}</div>}
            {promo && <div className="pok">🎟 {promo.code} qo‘llandi: {promo.label}</div>}
          </div>
          <div className="sumrows">
            <div><span>Mahsulotlar</span><b>{fmt(total)}</b></div>
            {discount > 0 && <div className="disc"><span>Promokod chegirmasi</span><b>−{fmt(discount)}</b></div>}
          </div>
          <div className="total"><span>To‘lash uchun:</span><b>{fmt(payable)}</b></div>
          <button className="add big wide" onClick={() => setStep('form')}>Rasmiylashtirish</button>
        </>
      ) : (
        <>
          <label>Ismingiz<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ism familiya" /></label>
          <label>Telefon<input type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+998 90 123 45 67" /></label>
          <label>Manzil<input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} placeholder="Shahar, ko'cha, uy" /></label>
          <label>Izoh (ixtiyoriy)<input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
          <div className="sumrows">
            <div><span>Mahsulotlar</span><b>{fmt(total)}</b></div>
            {discount > 0 && <div className="disc"><span>Promokod {promo.code}</span><b>−{fmt(discount)}</b></div>}
          </div>
          <div className="total"><span>To‘lash uchun:</span><b>{fmt(payable)}</b></div>
          <button className="add big wide" disabled={!ok || busy} onClick={submit}>{busy ? 'Yuborilmoqda...' : 'Buyurtma berish'}</button>
          {err && <p className="desc" style={{ color: '#ef4444', textAlign: 'center' }}>{err}</p>}
          <button className="link" onClick={() => setStep('cart')}>← Savatga qaytish</button>
        </>
      )}
    </div>
  );
}

/* ---------- Buyurtmalarim ---------- */
const ST = { new: ['Qabul qilindi', 'orange'], done: ['Bajarildi', 'green'], cancel: ['Bekor qilindi', 'red'] };
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
      <header className="ptitle"><h1>Buyurtmalarim</h1><p>Buyurtmalar tarixi va holati</p></header>
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
            {o.discount > 0 && <div className="size">Promokod {o.promo}: −{fmt(o.discount)}</div>}
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
      <header className="ptitle"><h1>Ma'lumot</h1><p>Biz haqimizda</p></header>
      <div className="infocard hero-info"><h3>{SHOP_NAME}</h3><p>{INFO.about}</p></div>
      {rows.length > 0 && <div className="infocard">{rows.map(([i, t, v]) => <div className="irow" key={t}><span>{i} {t}</span><b>{v}</b></div>)}</div>}
      <div className="infocard"><h3>🚚 Yetkazib berish</h3><p>{INFO.delivery}</p></div>
      <div className="infocard"><h3>💳 To'lov</h3><p>{INFO.payment}</p></div>
    </div>
  );
}

/* ---------- Asosiy ---------- */
const TABS = [['home', IHome, 'Bosh'], ['cats', IGrid, 'Bo‘limlar'], ['cart', ICart, 'Savat'], ['orders', IBox, 'Buyurtmalar'], ['info', IInfo, 'Info']];

export default function App() {
  const [tab, setTab] = useState('home');
  const [cat, setCat] = useState('all');
  const [open, setOpen] = useState(null);
  const [cart, rawChange, clear] = useCart();
  const [data, setData] = useState({ overrides: {}, custom: [], sales: [] });
  useEffect(() => { fetch('/api/products').then((r) => r.json()).then(setData).catch(() => {}); }, []);

  const products = useMemo(() => buildCatalog(PRODUCTS, data.overrides, data.custom, data.sales).filter((p) => !p.hidden), [data]);
  const change = (id, d) => {
    const p = products.find((x) => x.id === id);
    if (d > 0 && typeof p?.stock === 'number' && (cart[id] || 0) >= p.stock) { haptic('medium'); return; }
    rawChange(id, d);
  };
  const items = products.filter((p) => cart[p.id]).map((p) => ({ ...p, q: cart[p.id] }));
  const count = items.reduce((s, i) => s + i.q, 0);
  const total = items.reduce((s, i) => s + i.q * i.price, 0);

  const go = (t) => { setTab(t); window.scrollTo(0, 0); };

  return (
    <div className="app">
      {tab === 'home' && <Home products={products} cart={cart} change={change} setOpen={setOpen} cat={cat} setCat={setCat} count={count} goCart={() => go('cart')} />}
      {tab === 'cats' && <Categories products={products} onPick={(c) => { setCat(c); go('home'); }} />}
      {tab === 'cart' && <CartPage items={items} total={total} change={change} clear={clear} goHome={() => go('home')} goOrders={() => go('orders')} />}
      {tab === 'orders' && <Orders />}
      {tab === 'info' && <Info />}

      {count > 0 && tab !== 'cart' && (
        <button className="floatcart" onClick={() => go('cart')}><span className="fc-l"><ICart size={20} /> {count} ta mahsulot</span><b>{fmt(total)} <IChev size={16} /></b></button>
      )}

      <nav className="tabbar">
        {TABS.map(([id, Icon, name]) => (
          <button key={id} className={tab === id ? 'on' : ''} onClick={() => go(id)}>
            <span className="ti"><Icon size={22} />{id === 'cart' && count > 0 && <i>{count}</i>}</span><span className="tl">{name}</span>
          </button>
        ))}
      </nav>

      {open && <Detail p={open} q={cart[open.id]} onChange={change} onClose={() => setOpen(null)} />}
    </div>
  );
}
