import { useId, useState } from 'react';
import Sheet from './Sheet.jsx';
import { money } from '../lib/projects.js';
import { t } from '../lib/i18n.js';

// Hozirgi pulni kiritish: shundan keyin kirim qoʻshiladi, chiqim va toʻlovlar avtomatik ayiriladi
export default function BalanceSheet({ current, onSave, onClose }) {
  const uid = useId();
  const [v, setV] = useState(current ? String(current.balance) : '');
  const [err, setErr] = useState('');
  const submit = (e) => {
    e.preventDefault();
    const n = Number(String(v).replace(/\s/g, ''));
    if (!Number.isFinite(n) || v === '') return setErr(t('eAmount'));
    onSave(n);
  };
  const formId = `${uid}-form`;
  return (
    <Sheet title={t('blTitle')} onClose={onClose} dismissOnOverlay={false}
      footer={<><button type="button" className="btn btn-ghost" onClick={onClose}>{t('fCancel')}</button><button type="submit" form={formId} className="btn btn-primary">{t('fSave')}</button></>}>
      <form id={formId} onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor={`${uid}-b`}>{t('blAsk')}</label>
          <input id={`${uid}-b`} className={`input${err ? ' err' : ''}`} type="number" inputMode="numeric" value={v} onChange={(e) => { setV(e.target.value); setErr(''); }} placeholder="5000000" autoFocus />
          {err && <p className="err-text">{err}</p>}
        </div>
        {current && <p className="auto-note">{t('blNow')}: {money(current.balance)}</p>}
        <p className="auto-note">💡 {t('blHint')}</p>
      </form>
    </Sheet>
  );
}
