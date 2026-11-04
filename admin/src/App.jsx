import { useCallback, useEffect, useMemo, useState } from 'react';
import { PRODUCTS } from '../../shop/src/products.js';
import { IBox, ICheck, IClose, ILock, IOut, IPhone, IPin, IRefresh, ISearch, ITag } from '../../shop/src/Icons.jsx';

const SHOP = 'https://chilling-shop.pages.dev/img/';
const fmt = (n) => Number(n).toLocaleString('ru-RU').replace(/ /g, ' ') + " so'm";
const ST = { new: ['Yangi', 'amber'], done: ['Bajarildi', 'green'], cancel: ['Bekor', 'red'] };
const FILTERS = [['new', 'Yangi'], ['done', 'Bajarilgan'], ['cancel', 'Bekor'], ['all', 'Hammasi']];

export default function App() {
  const [pw, setPw] = useState(() => { try { return sessionStorage.getItem('pw') || ''; } catch { return ''; } });
  const [authed, setAuthed] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [base, setBase] = useState({});
  const [rows, setRows] = useState({});
  const [msg, setMsg] = useState('');
  const [filter, setFilter] = useState('new');
  const [q, setQ] = useState('');

  const api = useCallback(async (body) => {
    const r = await fetch('/api/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: pw, ...body }) });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Xato');
    return r.json();
  }, [pw]);

  const load = useCallback(async () => {
    const d = await api({ action: 'get' });
    setOrders(d.orders);
    const r = Object.fromEntries(PRODUCTS.map((p) => {
      const o = d.overrides[p.id] || {};
      return [p.id, { price: String(o.price ?? p.price), oldPrice: String(o.oldPrice || p.oldPrice || ''), hidden: o.hidden ?? !!p.hidden }];
    }));
    setRows(r); setBase(r);
  }, [api]);

  const login = async () => {
    setErr(''); setBusy(true);
    try { await load(); setAuthed(true); try { sessionStorage.setItem('pw', pw); } catch {} } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const logout = () => { try { sessionStorage.removeItem('pw'); } catch {} setAuthed(false); setPw(''); };
  useEffect(() => { if (pw) login(); /* eslint-disable-next-line */ }, []);
  useEffect(() => {
    if (!authed) return;
    const t = setInterval(() => api({ action: 'get' }).then((d) => setOrders(d.orders)).catch(() => {}), 30000);
    return () => clearInterval(t);
  }, [authed, api]);

  const setStatus = async (id, status) => { await api({ action: 'status', id, status }); const d = await api({ action: 'get' }); setOrders(d.orders); };
  const changed = useMemo(() => PRODUCTS.filter((p) => rows[p.id] && JSON.stringify(rows[p.id]) !== JSON.stringify(base[p.id])).length, [rows, base]);
  const savePrices = async () => {
    setMsg('Saqlanmoqda...');
    try { await api({ action: 'prices', overrides: rows }); setBase(rows); setMsg('Saqlandi ✓'); setTimeout(() => setMsg(''), 2200); } catch (e) { setMsg(e.message); }
  };
  const setRow = (id, k, v) => setRows((r) => ({ ...r, [id]: { ...r[id], [k]: v } }));

  if (!authed) return (
    <div className="login">
      <div className="lcard">
        <div className="logo big">C</div>
        <h1>Admin panel</h1>
        <p>Chilling Bet do'koni boshqaruvi</p>
        <div className="field"><ILock size={19} /><input type="password" placeholder="Parol" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && login()} /></div>
        <button className="btn" disabled={busy || !pw} onClick={login}>{busy ? 'Tekshirilmoqda...' : 'Kirish'}</button>
        {err && <div className="err">{err}</div>}
      </div>
    </div>
  );

  const st = (o) => o.status || 'new';
  const today = new Date().toDateString();
  const newCount = orders.filter((o) => st(o) === 'new').length;
  const revenue = orders.filter((o) => st(o) !== 'cancel').reduce((s, o) => s + o.total, 0);
  const shown = orders.filter((o) => filter === 'all' || st(o) === filter);
  const plist = PRODUCTS.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="app">
      <header className="top">
        <div className="brand"><div className="logo">C</div><div><div className="bname">Admin</div><div className="hello">Chilling Bet</div></div></div>
        <div className="tbtns">
          <button className="iconbtn" onClick={() => load()} aria-label="Yangilash"><IRefresh size={20} /></button>
          <button className="iconbtn" onClick={logout} aria-label="Chiqish"><IOut size={20} /></button>
        </div>
      </header>

      {tab === 'orders' ? (
        <>
          <div className="stats">
            <div className="stat s1"><span>Yangi buyurtma</span><b>{newCount}</b></div>
            <div className="stat s2"><span>Bugun</span><b>{orders.filter((o) => new Date(o.ts).toDateString() === today).length}</b></div>
            <div className="stat s3"><span>Jami buyurtma</span><b>{orders.length}</b></div>
            <div className="stat s4"><span>Umumiy summa</span><b className="sm">{fmt(revenue)}</b></div>
          </div>
          <div className="seg">
            {FILTERS.map(([k, n]) => <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{n}</button>)}
          </div>
          {shown.length === 0 && <div className="emptyst"><IBox size={40} /><p>Buyurtmalar yo'q</p></div>}
          {shown.map((o) => {
            const [label, color] = ST[st(o)];
            return (
              <div className={'order ' + color} key={o.id}>
                <div className="ohead">
                  <b>#{o.num}</b><span className={'tag ' + color}>{label}</span>
                  <span className="when">{new Date(o.ts).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
                <div className="cust">
                  <div className="cl"><b>{o.name}</b>
                    <span><IPin size={14} /> {o.address}</span>
                    {o.note && <span className="note">💬 {o.note}</span>}
                  </div>
                  <a className="call" href={'tel:' + o.phone}><IPhone size={17} />{o.phone}</a>
                </div>
                <div className="items">
                  {o.items.map((i) => (
                    <div className="it" key={i.id}><span>{i.name} <em>{i.size}</em></span><span>{i.q} × {fmt(i.price)}</span></div>
                  ))}
                </div>
                <div className="otot"><span>Jami</span><b>{fmt(o.total)}</b></div>
                <div className="oact">
                  {st(o) !== 'done' && <button className="btn ok" onClick={() => setStatus(o.id, 'done')}><ICheck size={17} /> Bajarildi</button>}
                  {st(o) !== 'cancel' && <button className="btn ghost" onClick={() => setStatus(o.id, 'cancel')}><IClose size={16} /> Bekor</button>}
                  {st(o) !== 'new' && <button className="btn ghost" onClick={() => setStatus(o.id, 'new')}>Yangiga qaytarish</button>}
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <>
          <div className="ptitle"><h2>Narxlar</h2><p>Narx, eski narx (chegirma) va mahsulotni yashirish</p></div>
          <div className="searchbox"><ISearch size={19} /><input placeholder="Mahsulot qidirish..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="plist">
            {plist.map((p) => rows[p.id] && (
              <div className={'prow' + (rows[p.id].hidden ? ' off' : '') + (JSON.stringify(rows[p.id]) !== JSON.stringify(base[p.id]) ? ' dirty' : '')} key={p.id}>
                <div className="ptop">
                  {p.img ? <img src={SHOP + p.img} alt="" loading="lazy" /> : <div className="ph">💡</div>}
                  <div className="pn"><b>{p.name}</b><span>{p.size}</span></div>
                  <label className="sw"><input type="checkbox" checked={!rows[p.id].hidden} onChange={(e) => setRow(p.id, 'hidden', !e.target.checked)} /><i /></label>
                </div>
                <div className="pin">
                  <label>Narx<input type="number" inputMode="numeric" value={rows[p.id].price} onChange={(e) => setRow(p.id, 'price', e.target.value)} /></label>
                  <label>Eski narx<input type="number" inputMode="numeric" value={rows[p.id].oldPrice} placeholder="—" onChange={(e) => setRow(p.id, 'oldPrice', e.target.value)} /></label>
                </div>
              </div>
            ))}
          </div>
          {(changed > 0 || msg) && (
            <div className="savebar">
              <span>{msg || `${changed} ta o'zgarish`}</span>
              <button className="btn" onClick={savePrices} disabled={!changed}>Saqlash</button>
            </div>
          )}
        </>
      )}

      <nav className="tabbar">
        <button className={tab === 'orders' ? 'on' : ''} onClick={() => setTab('orders')}><span className="ti"><IBox size={22} />{newCount > 0 && <i>{newCount}</i>}</span><span className="tl">Buyurtmalar</span></button>
        <button className={tab === 'prices' ? 'on' : ''} onClick={() => setTab('prices')}><span className="ti"><ITag size={22} /></span><span className="tl">Narxlar</span></button>
      </nav>
    </div>
  );
}
