import { useCallback, useEffect, useMemo, useState } from 'react';
import { CATEGORIES, PRODUCTS } from '../../shop/src/products.js';
import { buildCatalog } from '../../shop/src/lib/pricing.js';
import { IBox, ICamera, ICheck, IClose, IEdit, ILock, IOut, IPercent, IPhone, IPin, IPlus, IRefresh, ISearch, ITag, ITrash } from '../../shop/src/Icons.jsx';

const ORIGIN = 'https://chilling-shop.pages.dev';
const imgUrl = (f) => (f.startsWith('data:') ? f : f.startsWith('/') ? ORIGIN + f : `${ORIGIN}/img/${f}`);
const EMPTY = { id: 0, stock: '', name: '', cat: 'other', size: '', price: '', oldPrice: '', desc: '', hit: false, isNew: false, hidden: false, img: '' };

// rasmni brauzerda kichraytirish (max 900px, JPEG)
const shrink = (file) => new Promise((res, rej) => {
  const fr = new FileReader();
  fr.onload = () => {
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, 900 / Math.max(im.width, im.height));
      const c = document.createElement('canvas');
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
      res(c.toDataURL('image/jpeg', 0.82));
    };
    im.onerror = rej; im.src = fr.result;
  };
  fr.onerror = rej; fr.readAsDataURL(file);
});
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
  const [raw, setRaw] = useState({ overrides: {}, custom: [], sales: [], promos: [] });
  const [sales, setSales] = useState([]);
  const [promos, setPromos] = useState([]);
  const [edit, setEdit] = useState(null);
  const [toast, setToast] = useState('');
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
    setOrders(d.orders); setRaw(d); setSales(d.sales); setPromos(d.promos);
    const cat = buildCatalog(PRODUCTS, d.overrides, d.custom, []);
    const r = Object.fromEntries(cat.map((p) => [p.id, { price: String(p.price), oldPrice: String(p.oldPrice || ''), hidden: !!p.hidden, stock: p.stock === undefined ? '' : String(p.stock) }]));
    setRows(r); setBase(r);
  }, [api]);
  const [sending, setSending] = useState(false);
  const sendReport = async () => {
    setSending(true);
    try { const r = await api({ action: 'report_now' }); flash(r.sent ? `Yuborildi: ${r.sent} ta adminga ✓` : 'Admin topilmadi (botga /admin parol yozing)'); } catch (e) { flash(e.message); }
    setSending(false);
  };
  const flash = (t) => { setToast(t); setTimeout(() => setToast(''), 2200); };

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
  const catalog = useMemo(() => buildCatalog(PRODUCTS, raw.overrides, raw.custom, []), [raw]);
  const changed = useMemo(() => catalog.filter((p) => rows[p.id] && JSON.stringify(rows[p.id]) !== JSON.stringify(base[p.id])).length, [catalog, rows, base]);
  const savePrices = async () => {
    setMsg('Saqlanmoqda...');
    try { await api({ action: 'prices', overrides: rows }); await load(); setMsg('Saqlandi ✓'); setTimeout(() => setMsg(''), 2200); } catch (e) { setMsg(e.message); }
  };
  const saveProduct = async (p, image) => {
    await api({ action: 'product_save', product: p, image }); await load(); setEdit(null); flash(p.id ? 'Saqlandi ✓' : "Mahsulot qo'shildi ✓");
  };
  const delProduct = async (id) => { await api({ action: 'product_delete', id }); await load(); setEdit(null); flash("O'chirildi"); };
  const saveSales = async () => { try { await api({ action: 'sales_save', sales }); await load(); flash('Skidkalar saqlandi ✓'); } catch (e) { flash(e.message); } };
  const savePromos = async () => { try { await api({ action: 'promos_save', promos }); await load(); flash('Promokodlar saqlandi ✓'); } catch (e) { flash(e.message); } };
  const setRow = (id, k, v) => setRows((r) => ({ ...r, [id]: { ...r[id], [k]: v } }));

  if (!authed) return (
    <div className="login">
      <div className="lcard">
        <img className="logo big" src="./logo.svg" alt="" />
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
  const plist = catalog.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="app">
      <header className="top">
        <div className="brand"><img className="logo" src="./logo.svg" alt="" /><div><div className="bname">Admin</div><div className="hello">Chilling Bet</div></div></div>
        <div className="tbtns">
          <a className="iconbtn" href="./guide.mp4" target="_blank" rel="noreferrer" aria-label="Video qo'llanma" title="Video qo'llanma">🎬</a>
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
                {o.discount > 0 && <div className="odisc"><span>🎟 Promokod {o.promo}</span><b>−{fmt(o.discount)}</b></div>}
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
      ) : tab === 'products' ? (
        <>
          <div className="ptitle"><h2>Mahsulotlar</h2><p>Narxni shu yerning o'zida o'zgartiring yoki ✎ bilan to'liq tahrirlang</p></div>
          <button className="btn addp" onClick={() => setEdit({ ...EMPTY })}><IPlus size={19} /> Mahsulot qo'shish</button>
          <div className="searchbox"><ISearch size={19} /><input placeholder="Mahsulot qidirish..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="plist">
            {plist.map((p) => rows[p.id] && (
              <div className={'prow' + (rows[p.id].hidden ? ' off' : '') + (JSON.stringify(rows[p.id]) !== JSON.stringify(base[p.id]) ? ' dirty' : '')} key={p.id}>
                <div className="ptop">
                  {p.img ? <img src={imgUrl(p.img)} alt="" loading="lazy" /> : <div className="ph">💡</div>}
                  <div className="pn"><b>{p.name}</b><span>{p.size}{p.id >= 1000 ? ' · yangi qo\'shilgan' : ''}</span></div>
                  <button className="editb" onClick={() => setEdit({ ...EMPTY, ...p, price: String(p.price), oldPrice: String(p.oldPrice || ''), stock: p.stock === undefined ? '' : String(p.stock) })} aria-label="Tahrirlash"><IEdit size={18} /></button>
                  <label className="sw"><input type="checkbox" checked={!rows[p.id].hidden} onChange={(e) => setRow(p.id, 'hidden', !e.target.checked)} /><i /></label>
                </div>
                <div className="pin three">
                  <label>Narx<input type="number" inputMode="numeric" value={rows[p.id].price} onChange={(e) => setRow(p.id, 'price', e.target.value)} /></label>
                  <label>Eski narx<input type="number" inputMode="numeric" value={rows[p.id].oldPrice} placeholder="—" onChange={(e) => setRow(p.id, 'oldPrice', e.target.value)} /></label>
                  <label>Omborda<input type="number" inputMode="numeric" className={rows[p.id].stock !== '' && Number(rows[p.id].stock) <= 10 ? 'lowin' : ''} value={rows[p.id].stock} placeholder="cheksiz" onChange={(e) => setRow(p.id, 'stock', e.target.value)} /></label>
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
      ) : (
        <>
          <div className="ptitle"><h2>Aksiyalar</h2><p>Skidkalar va promokodlar</p></div>

          <div className="sechead"><h3>🏷️ Skidkalar</h3>
            <button className="mini" onClick={() => setSales([...sales, { id: Math.random().toString(36).slice(2, 9), name: '', percent: 10, scope: 'all', ends: '', active: true }])}><IPlus size={15} /> Qo'shish</button></div>
          <p className="hint">Tanlangan bo'limdagi (yoki hamma) mahsulotlarga foizli chegirma. Eski narx avtomatik chiziladi.</p>
          {sales.length === 0 && <div className="emptyst small">Skidka yo'q</div>}
          {sales.map((s, i) => {
            const set = (k, v) => setSales(sales.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
            return (
              <div className={'acard' + (s.active ? '' : ' off')} key={s.id}>
                <div className="arow1">
                  <input className="tinp" placeholder="Nomi (masalan: Yangi yil)" value={s.name} onChange={(e) => set('name', e.target.value)} />
                  <label className="sw"><input type="checkbox" checked={s.active} onChange={(e) => set('active', e.target.checked)} /><i /></label>
                </div>
                <div className="agrid">
                  <label>Foiz (%)<input type="number" inputMode="numeric" value={s.percent} onChange={(e) => set('percent', e.target.value)} /></label>
                  <label>Qayerga<select value={s.scope} onChange={(e) => set('scope', e.target.value)}><option value="all">Hamma mahsulot</option>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select></label>
                  <label>Tugash sanasi<input type="date" value={s.ends} onChange={(e) => set('ends', e.target.value)} /></label>
                </div>
                <button className="del" onClick={() => setSales(sales.filter((_, j) => j !== i))}><ITrash size={16} /> O'chirish</button>
              </div>
            );
          })}
          <button className="btn" onClick={saveSales}>Skidkalarni saqlash</button>

          <div className="sechead" style={{ marginTop: 28 }}><h3>🎟 Promokodlar</h3>
            <button className="mini" onClick={() => setPromos([...promos, { code: '', type: 'percent', value: 10, min: 0, maxUses: 0, used: 0, ends: '', active: true }])}><IPlus size={15} /> Qo'shish</button></div>
          <p className="hint">Mijoz savatda kodni kiritsa, chegirma beriladi. Limit 0 — cheksiz.</p>
          {promos.length === 0 && <div className="emptyst small">Promokod yo'q</div>}
          {promos.map((p, i) => {
            const set = (k, v) => setPromos(promos.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
            return (
              <div className={'acard' + (p.active ? '' : ' off')} key={i}>
                <div className="arow1">
                  <input className="tinp code" placeholder="KOD" value={p.code} onChange={(e) => set('code', e.target.value.toUpperCase())} />
                  <label className="sw"><input type="checkbox" checked={p.active} onChange={(e) => set('active', e.target.checked)} /><i /></label>
                </div>
                <div className="agrid">
                  <label>Turi<select value={p.type} onChange={(e) => set('type', e.target.value)}><option value="percent">Foiz (%)</option><option value="fixed">Summa (so'm)</option></select></label>
                  <label>{p.type === 'percent' ? 'Foiz' : "Summa (so'm)"}<input type="number" inputMode="numeric" value={p.value} onChange={(e) => set('value', e.target.value)} /></label>
                  <label>Minimal buyurtma<input type="number" inputMode="numeric" value={p.min} onChange={(e) => set('min', e.target.value)} /></label>
                  <label>Limit (marta)<input type="number" inputMode="numeric" value={p.maxUses} onChange={(e) => set('maxUses', e.target.value)} /></label>
                  <label>Tugash sanasi<input type="date" value={p.ends} onChange={(e) => set('ends', e.target.value)} /></label>
                  <label>Ishlatilgan<div className="used">{p.used || 0} marta</div></label>
                </div>
                <button className="del" onClick={() => setPromos(promos.filter((_, j) => j !== i))}><ITrash size={16} /> O'chirish</button>
              </div>
            );
          })}
          <button className="btn" onClick={savePromos}>Promokodlarni saqlash</button>

          <div className="sechead" style={{ marginTop: 28 }}><h3>📊 Haftalik hisobot</h3></div>
          <p className="hint">Har yakshanba soat 20:00 da (Toshkent) barcha adminlarga PDF hisobot avtomatik yuboriladi: sotuvlar, daromad, kam qolgan mahsulotlar.</p>
          <button className="btn" disabled={sending} onClick={sendReport}>{sending ? 'Yuborilmoqda...' : 'Hisobotni hozir yuborish'}</button>
        </>
      )}

      {toast && <div className="toast">{toast}</div>}
      {edit && <Editor p={edit} onClose={() => setEdit(null)} onSave={saveProduct} onDelete={delProduct} />}

      <nav className="tabbar">
        <button className={tab === 'orders' ? 'on' : ''} onClick={() => setTab('orders')}><span className="ti"><IBox size={22} />{newCount > 0 && <i>{newCount}</i>}</span><span className="tl">Buyurtma</span></button>
        <button className={tab === 'products' ? 'on' : ''} onClick={() => setTab('products')}><span className="ti"><ITag size={22} /></span><span className="tl">Mahsulot</span></button>
        <button className={tab === 'promo' ? 'on' : ''} onClick={() => setTab('promo')}><span className="ti"><IPercent size={22} /></span><span className="tl">Aksiya</span></button>
      </nav>
    </div>
  );
}

/* ---------- Mahsulot tahrirlash oynasi ---------- */
function Editor({ p, onClose, onSave, onDelete }) {
  const [f, setF] = useState(p);
  const [image, setImage] = useState(null); // yangi rasm (dataURL)
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const isNew = !f.id;
  const pick = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { setImage(await shrink(file)); } catch { setErr("Rasmni o'qib bo'lmadi"); }
  };
  const save = async () => {
    setErr('');
    if (!f.name.trim() || !(Number(f.price) > 0)) { setErr('Nom va narxni kiriting'); return; }
    setBusy(true);
    try { await onSave({ ...f, id: f.id || 0 }, image); } catch (e) { setErr(e.message); setBusy(false); }
  };
  const preview = image || (f.img ? imgUrl(f.img) : '');
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        <div className="shead"><h3>{isNew ? "Yangi mahsulot" : 'Tahrirlash'}</h3><button className="xb" onClick={onClose}><IClose size={18} /></button></div>
        <div className="sbody">
          <label className="upl">
            {preview ? <img src={preview} alt="" /> : <div className="upl-ph"><ICamera size={34} /><span>Rasm yuklash</span></div>}
            <input type="file" accept="image/*" onChange={pick} hidden />
            {preview && <em>Almashtirish</em>}
          </label>
          <label>Nomi<input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Masalan: Persil 3 kg" /></label>
          <div className="two">
            <label>Kategoriya<select value={f.cat} onChange={(e) => set('cat', e.target.value)}>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select></label>
            <label>Hajmi / soni<input value={f.size} onChange={(e) => set('size', e.target.value)} placeholder="3 kg, 60 dona..." /></label>
          </div>
          <div className="two">
            <label>Narx (so'm)<input type="number" inputMode="numeric" value={f.price} onChange={(e) => set('price', e.target.value)} /></label>
            <label>Eski narx<input type="number" inputMode="numeric" value={f.oldPrice} onChange={(e) => set('oldPrice', e.target.value)} placeholder="—" /></label>
          </div>
          <label>Omborda necha dona bor (bo'sh = cheksiz)<input type="number" inputMode="numeric" value={f.stock} onChange={(e) => set('stock', e.target.value)} placeholder="Masalan: 50" /></label>
          <label>Tavsif<textarea rows="3" value={f.desc} onChange={(e) => set('desc', e.target.value)} placeholder="Mahsulot haqida qisqacha..." /></label>
          <div className="chips">
            <label className={'chip' + (f.hit ? ' on' : '')}><input type="checkbox" checked={f.hit} onChange={(e) => set('hit', e.target.checked)} hidden />🔥 Hit</label>
            <label className={'chip' + (f.isNew ? ' on' : '')}><input type="checkbox" checked={f.isNew} onChange={(e) => set('isNew', e.target.checked)} hidden />✨ Yangi</label>
            <label className={'chip' + (!f.hidden ? ' on' : '')}><input type="checkbox" checked={!f.hidden} onChange={(e) => set('hidden', !e.target.checked)} hidden />👁 Ko'rinadi</label>
          </div>
          {err && <div className="err">{err}</div>}
        </div>
        <div className="sbar">
          {!isNew && f.id >= 1000 && <button className="btn ghost" onClick={() => confirm("Mahsulot o'chirilsinmi?") && onDelete(f.id)}><ITrash size={17} /></button>}
          <button className="btn" onClick={save} disabled={busy}>{busy ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        </div>
      </div>
    </div>
  );
}
