import { useCallback, useEffect, useState } from 'react';
import { PRODUCTS } from '../../shop/src/products.js';

const fmt = (n) => Number(n).toLocaleString('ru-RU').replace(/ /g, ' ') + " so'm";
const ST = { new: ['🆕 Yangi', 'orange'], done: ['✅ Bajarildi', 'green'], cancel: ['❌ Bekor', 'red'] };

export default function App() {
  const [pw, setPw] = useState(() => { try { return sessionStorage.getItem('pw') || ''; } catch { return ''; } });
  const [authed, setAuthed] = useState(false);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [rows, setRows] = useState({});
  const [msg, setMsg] = useState('');
  const [filter, setFilter] = useState('new');

  const api = useCallback(async (body) => {
    const r = await fetch('/api/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: pw, ...body }) });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Xato');
    return r.json();
  }, [pw]);

  const load = useCallback(async () => {
    const d = await api({ action: 'get' });
    setOrders(d.orders);
    setRows(Object.fromEntries(PRODUCTS.map((p) => {
      const o = d.overrides[p.id] || {};
      return [p.id, { price: o.price ?? p.price, oldPrice: o.oldPrice || p.oldPrice || '', hidden: !!o.hidden }];
    })));
  }, [api]);

  const login = async () => {
    setErr('');
    try { await load(); setAuthed(true); try { sessionStorage.setItem('pw', pw); } catch {} } catch (e) { setErr(e.message); }
  };
  useEffect(() => { if (pw) login(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { if (!authed) return; const t = setInterval(() => load().catch(() => {}), 30000); return () => clearInterval(t); }, [authed, load]);

  const setStatus = async (id, status) => { await api({ action: 'status', id, status }); await load(); };
  const savePrices = async () => { setMsg('Saqlanmoqda...'); try { await api({ action: 'prices', overrides: rows }); setMsg('✅ Saqlandi'); } catch (e) { setMsg('❌ ' + e.message); } };
  const setRow = (id, k, v) => setRows({ ...rows, [id]: { ...rows[id], [k]: v } });

  if (!authed) return (
    <div className="wrap login">
      <div className="logo">🛠️</div><h1>Admin panel</h1><p className="muted">Chilling Bet do'koni</p>
      <input type="password" placeholder="Parol" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && login()} />
      <button className="btn" onClick={login}>Kirish</button>
      {err && <p className="err">{err}</p>}
    </div>
  );

  const today = new Date().toDateString();
  const todays = orders.filter((o) => new Date(o.ts).toDateString() === today);
  const revenue = orders.filter((o) => o.status !== 'cancel').reduce((s, o) => s + o.total, 0);
  const shown = orders.filter((o) => filter === 'all' || (o.status || 'new') === filter);

  return (
    <div className="wrap">
      <h1>🛠️ Admin</h1>
      <div className="stats">
        <div><b>{orders.filter((o) => (o.status || 'new') === 'new').length}</b><span>Yangi</span></div>
        <div><b>{todays.length}</b><span>Bugun</span></div>
        <div><b>{orders.length}</b><span>Jami</span></div>
        <div className="wide"><b>{fmt(revenue)}</b><span>Umumiy summa</span></div>
      </div>
      <div className="tabs">
        <button className={tab === 'orders' ? 'on' : ''} onClick={() => setTab('orders')}>📦 Buyurtmalar</button>
        <button className={tab === 'prices' ? 'on' : ''} onClick={() => setTab('prices')}>💰 Narxlar</button>
      </div>

      {tab === 'orders' ? (
        <>
          <div className="chips">
            {[['new', 'Yangi'], ['done', 'Bajarilgan'], ['cancel', 'Bekor'], ['all', 'Hammasi']].map(([k, n]) => (
              <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{n}</button>
            ))}
            <button onClick={() => load()}>🔄</button>
          </div>
          {shown.length === 0 && <p className="muted center">Buyurtmalar yo'q</p>}
          {shown.map((o) => {
            const [label, color] = ST[o.status || 'new'];
            return (
              <div className="order" key={o.id}>
                <div className="ohead">
                  <b>#{o.num}</b><span className={'tag ' + color}>{label}</span>
                  <span className="muted">{new Date(o.ts).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
                <div>👤 {o.name} · <a href={'tel:' + o.phone}>📞 {o.phone}</a></div>
                <div>📍 {o.address}</div>
                {o.note && <div>💬 {o.note}</div>}
                <ul>{o.items.map((i) => <li key={i.id}>{i.name} <span className="muted">({i.size})</span> × {i.q} = {fmt(i.price * i.q)}</li>)}</ul>
                <div className="otot">Jami: <b>{fmt(o.total)}</b></div>
                <div className="oact">
                  {(o.status || 'new') !== 'done' && <button className="btn sm" onClick={() => setStatus(o.id, 'done')}>✅ Bajarildi</button>}
                  {(o.status || 'new') !== 'cancel' && <button className="btn sm gray" onClick={() => setStatus(o.id, 'cancel')}>❌ Bekor</button>}
                  {(o.status || 'new') !== 'new' && <button className="btn sm gray" onClick={() => setStatus(o.id, 'new')}>↩️ Yangi</button>}
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <>
          {PRODUCTS.map((p) => rows[p.id] && (
            <div className="arow" key={p.id}>
              <div className="pname">{p.name}<div className="muted">{p.size}</div></div>
              <input type="number" inputMode="numeric" value={rows[p.id].price} onChange={(e) => setRow(p.id, 'price', e.target.value)} placeholder="Narx" />
              <input type="number" inputMode="numeric" value={rows[p.id].oldPrice} onChange={(e) => setRow(p.id, 'oldPrice', e.target.value)} placeholder="Eski narx" />
              <label className="chk"><input type="checkbox" checked={rows[p.id].hidden} onChange={(e) => setRow(p.id, 'hidden', e.target.checked)} /> yashir</label>
            </div>
          ))}
          <div className="save"><button className="btn" onClick={savePrices}>Saqlash</button><div>{msg}</div></div>
        </>
      )}
    </div>
  );
}
