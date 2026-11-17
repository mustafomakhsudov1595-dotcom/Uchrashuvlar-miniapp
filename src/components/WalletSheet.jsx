import { useId, useState } from 'react';
import Sheet from './Sheet.jsx';
import Choice from './Choice.jsx';
import DateField from './DateField.jsx';
import { rnd } from '../lib/currency.js';
import { todayISO } from '../lib/dates.js';
import { t } from '../lib/i18n.js';

// Hamyondagi pulni tez oshirish (＋) yoki kamaytirish (－): summa yoziladi, balans va tarix oʻzi yangilanadi
export default function WalletSheet({ mode, wallet, onSave, onClose }) {
  const uid = useId();
  const usd = wallet === 'usd', isIn = mode === 'in';
  const [a, setA] = useState('');
  const [note, setNote] = useState('');
  const [d, setD] = useState(todayISO());
  const [cat, setCat] = useState('other');
  const [err, setErr] = useState('');
  const submit = (e) => {
    e.preventDefault();
    const n = Number(String(a).replace(/\s/g, '').replace(',', '.'));
    if (!(n > 0)) return setErr(t('eAmount'));
    const base = { a: rnd(n, usd), w: wallet, d: d || todayISO(), note: note.trim(), pid: '' };
    onSave(isIn ? { ...base, k: 'in', ik: 'other', cat: 'other' } : { ...base, cat });
  };
  const formId = `${uid}-form`;
  const name = t('wlNames')[wallet];
  return (
    <Sheet title={`${isIn ? '＋' : '－'} ${name}`} onClose={onClose} dismissOnOverlay={false}
      footer={<><button type="button" className="btn btn-ghost" onClick={onClose}>{t('fCancel')}</button><button type="submit" form={formId} className={`btn ${isIn ? 'btn-primary' : 'btn-accent'}`}>{isIn ? t('wlAdd') : t('wlSub')}</button></>}>
      <form id={formId} onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor={`${uid}-a`}>{isIn ? t('wlAddAsk', name) : t('wlSubAsk', name)}</label>
          <input id={`${uid}-a`} className={`input${err ? ' err' : ''}`} type="number" inputMode="decimal" step={usd ? '0.01' : '1'} min="0" value={a} onChange={(e) => { setA(e.target.value); setErr(''); }} placeholder={usd ? '100' : '500000'} autoFocus />
          {err && <p className="err-text">{err}</p>}
        </div>
        {!isIn && (
          <div className="field">
            <span className="label-like">{t('exCat')}</span>
            <Choice value={cat} onChange={setCat} options={['ads', 'team', 'host', 'tools', 'other'].map((k) => ({ v: k, label: t('exCats')[k] }))} />
          </div>
        )}
        <div className="field">
          <label htmlFor={`${uid}-n`}>{t('inNote')}</label>
          <input id={`${uid}-n`} className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={100} placeholder={isIn ? t('inNotePh') : t('exNote')} />
        </div>
        <div className="field">
          <label htmlFor={`${uid}-d`}>{t('exDate')}</label>
          <DateField id={`${uid}-d`} value={d} onChange={setD} />
        </div>
      </form>
    </Sheet>
  );
}
