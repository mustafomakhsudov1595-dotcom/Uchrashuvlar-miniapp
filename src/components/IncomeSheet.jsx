import { useId, useState } from 'react';
import Sheet from './Sheet.jsx';
import Choice from './Choice.jsx';
import DateField from './DateField.jsx';
import { todayISO } from '../lib/dates.js';
import { t } from '../lib/i18n.js';

// Qoʻlda kirim qoʻshish (loyihadan tashqari: maslahat, naqd, boshqa)
export default function IncomeSheet({ onSave, onClose }) {
  const uid = useId();
  const [f, setF] = useState({ a: '', ik: 'site', note: '', d: todayISO() });
  const [err, setErr] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (!(Number(f.a) > 0)) return setErr(t('eAmount'));
    onSave({ a: Math.round(Number(f.a)), k: 'in', ik: f.ik, note: f.note.trim(), d: f.d || todayISO(), cat: 'other', pid: '' });
  };
  const formId = `${uid}-form`;
  const kinds = t('stKinds');
  return (
    <Sheet title={t('inNew')} onClose={onClose} dismissOnOverlay={false}
      footer={<><button type="button" className="btn btn-ghost" onClick={onClose}>{t('fCancel')}</button><button type="submit" form={formId} className="btn btn-primary">{t('fSave')}</button></>}>
      <form id={formId} onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor={`${uid}-a`}>{t('exAmount')}</label>
          <input id={`${uid}-a`} className={`input${err ? ' err' : ''}`} type="number" inputMode="numeric" min="0" value={f.a} onChange={(e) => { setF((p) => ({ ...p, a: e.target.value })); setErr(''); }} placeholder="500000" autoFocus />
          {err && <p className="err-text">{err}</p>}
        </div>
        <div className="field">
          <span className="label-like">{t('exCat')}</span>
          <Choice value={f.ik} onChange={(v) => setF((p) => ({ ...p, ik: v }))} options={['site', 'bot', 'video', 'sub', 'other'].map((k) => ({ v: k, label: kinds[k] }))} />
        </div>
        <div className="field">
          <label htmlFor={`${uid}-n`}>{t('inNote')}</label>
          <input id={`${uid}-n`} className="input" value={f.note} onChange={(e) => setF((p) => ({ ...p, note: e.target.value }))} maxLength={100} placeholder={t('inNotePh')} />
        </div>
        <div className="field">
          <label htmlFor={`${uid}-d`}>{t('exDate')}</label>
          <DateField id={`${uid}-d`} value={f.d} onChange={(v) => setF((p) => ({ ...p, d: v }))} />
        </div>
      </form>
    </Sheet>
  );
}
