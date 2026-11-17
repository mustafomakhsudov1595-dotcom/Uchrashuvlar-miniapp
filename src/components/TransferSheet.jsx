import { useId, useState } from 'react';
import Sheet from './Sheet.jsx';
import Choice from './Choice.jsx';
import DateField from './DateField.jsx';
import { getRate, rnd } from '../lib/currency.js';
import { todayISO } from '../lib/dates.js';
import { t } from '../lib/i18n.js';

// Hamyonlar orasida oʻtkazma yoki valyuta almashtirish (soʻm ⇄ dollar kurs boʻyicha taklif qilinadi)
export default function TransferSheet({ onSave, onClose }) {
  const uid = useId();
  const [f, setF] = useState({ w: 'cash', w2: 'usd', a: '', a2: '', d: todayISO(), manual: false });
  const [err, setErr] = useState('');
  const rate = getRate();
  const wn = t('wlNames');
  const opts = ['cash', 'card', 'usd'].map((k) => ({ v: k, label: wn[k] }));
  const fx = (w, w2) => w !== w2 && (w === 'usd' || w2 === 'usd');
  const suggest = (a, w, w2) => {
    const n = Number(a);
    if (!(n > 0)) return '';
    if (!fx(w, w2)) return String(n);
    if (!rate) return '';
    return String(w === 'usd' ? rnd(n * rate, false) : rnd(n / rate, true));
  };
  const upd = (patch) => setF((p) => {
    const n = { ...p, ...patch };
    if (!n.manual || 'w' in patch || 'w2' in patch) { if ('w' in patch || 'w2' in patch) n.manual = false; if (!n.manual) n.a2 = suggest(n.a, n.w, n.w2); }
    return n;
  });
  const submit = (e) => {
    e.preventDefault();
    if (f.w === f.w2) return setErr(t('trSame'));
    const a = Number(f.a), a2 = Number(f.a2);
    if (!(a > 0) || !(a2 > 0)) return setErr(t('eAmount'));
    onSave({ k: 'tr', w: f.w, w2: f.w2, a: rnd(a, f.w === 'usd'), a2: rnd(a2, f.w2 === 'usd'), d: f.d || todayISO(), cat: 'other', pid: '', note: '' });
  };
  const formId = `${uid}-form`;
  return (
    <Sheet title={t('trTitle')} onClose={onClose} dismissOnOverlay={false}
      footer={<><button type="button" className="btn btn-ghost" onClick={onClose}>{t('fCancel')}</button><button type="submit" form={formId} className="btn btn-primary">{t('fSave')}</button></>}>
      <form id={formId} onSubmit={submit} noValidate>
        <div className="field"><span className="label-like">{t('trFrom')}</span><Choice value={f.w} onChange={(v) => upd({ w: v })} options={opts} /></div>
        <div className="field"><span className="label-like">{t('trTo')}</span><Choice value={f.w2} onChange={(v) => upd({ w2: v })} options={opts} /></div>
        <div className="row2">
          <div className="field">
            <label htmlFor={`${uid}-a`}>{t('trAmount')} ({wn[f.w]})</label>
            <input id={`${uid}-a`} className={`input${err ? ' err' : ''}`} type="number" inputMode="decimal" step={f.w === 'usd' ? '0.01' : '1'} value={f.a} onChange={(e) => { upd({ a: e.target.value }); setErr(''); }} autoFocus />
          </div>
          <div className="field">
            <label htmlFor={`${uid}-a2`}>{t('trGet')} ({wn[f.w2]})</label>
            <input id={`${uid}-a2`} className="input" type="number" inputMode="decimal" step={f.w2 === 'usd' ? '0.01' : '1'} value={f.a2} onChange={(e) => { setF((p) => ({ ...p, a2: e.target.value, manual: true })); setErr(''); }} />
          </div>
        </div>
        {fx(f.w, f.w2) && <p className="auto-note">💱 {rate ? `$1 = ${Math.round(rate)} · ${t('trAuto')}` : t('trNoRate')}</p>}
        {err && <p className="err-text">{err}</p>}
        <div className="field"><label htmlFor={`${uid}-d`}>{t('exDate')}</label><DateField id={`${uid}-d`} value={f.d} onChange={(v) => setF((p) => ({ ...p, d: v }))} /></div>
      </form>
    </Sheet>
  );
}
