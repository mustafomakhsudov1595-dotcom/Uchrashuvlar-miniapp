import { useState } from 'react';
import { PRODUCTS } from './products.js';

export default function Admin({ overrides, onSaved }) {
  const [pw, setPw] = useState('');
  const [authed, setAuthed] = useState(false);
  const [msg, setMsg] = useState('');
  const [rows, setRows] = useState(() => Object.fromEntries(PRODUCTS.map((p) => {
    const o = overrides[p.id] || {};
    return [p.id, { price: o.price ?? p.price, oldPrice: o.oldPrice ?? p.oldPrice ?? '', hidden: !!o.hidden }];
  })));

  const call = async (overridesBody) => {
    const r = await fetch('/api/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: pw, overrides: overridesBody }) });
    return r.ok;
  };
  const login = async () => { setMsg(''); if (await call(undefined)) setAuthed(true); else setMsg('Parol noto\'g\'ri'); };
  const save = async () => {
    setMsg('Saqlanmoqda...');
    if (await call(rows)) { setMsg('✅ Saqlandi'); onSaved(rows); } else setMsg('❌ Xato');
  };
  const set = (id, k, v) => setRows({ ...rows, [id]: { ...rows[id], [k]: v } });

  if (!authed) return (
    <div className="app admin"><h1>Admin</h1>
      <label>Parol<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && login()} /></label>
      <button className="add big wide" onClick={login}>Kirish</button>
      {msg && <p className="empty">{msg}</p>}
    </div>
  );
  return (
    <div className="app admin"><h1>Admin: narxlar</h1>
      {PRODUCTS.map((p) => (
        <div className="arow" key={p.id}>
          <div className="name">{p.name}<div className="size">{p.size}</div></div>
          <input type="number" inputMode="numeric" value={rows[p.id].price} onChange={(e) => set(p.id, 'price', e.target.value)} placeholder="Narx" />
          <input type="number" inputMode="numeric" value={rows[p.id].oldPrice} onChange={(e) => set(p.id, 'oldPrice', e.target.value)} placeholder="Eski narx" />
          <label className="chk"><input type="checkbox" checked={rows[p.id].hidden} onChange={(e) => set(p.id, 'hidden', e.target.checked)} /> yashir</label>
        </div>
      ))}
      <div className="asave"><button className="add big wide" onClick={save}>Saqlash</button><div>{msg}</div></div>
    </div>
  );
}
