import { useId, useState } from 'react';
import Sheet from './Sheet.jsx';
import { fmtW } from '../lib/currency.js';
import { t } from '../lib/i18n.js';

// Hamyondagi hozirgi pulni kiritish: shundan keyin kirim qoʻshiladi, chiqim va toʻlovlar avtomatik ayiriladi
export default function BalanceSheet({ wallet = 'cash', current, onSave, onClose }) {
  const uid = useId();
  const usd = wallet === 'usd';
  const [v, setV] = useState(current !== null && current !== undefined ? String(current) : '');
  const [err, setErr] = useState('');
  const submit = (e) => {
    e.preventDefault();
    const n = Number(String(v).replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(n) || v === '') return setErr(t('eAmount'));
    onSave(n);
  };
  const formId = `${uid}-form`;
  return (
    <Sheet title={`${t('blTitle')} · ${t('wlNames')[wallet]}`} onClose={onClose} dismissOnOverlay={false}
      footer={<><button type="button" className="btn btn-ghost" onClick={onClose}>{t('fCancel')}</button><button type="submit" form={formId} className="btn btn-primary">{t('fSave')}</button></>}>
      <form id={formId} onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor={`${uid}-b`}>{t('blAskW', t('wlNames')[wallet])}</label>
          <input id={`${uid}-b`} className={`input${err ? ' err' : ''}`} type="number" inputMode="decimal" step={usd ? '0.01' : '1'} value={v} onChange={(e) => { setV(e.target.value); setErr(''); }} placeholder={usd ? '1200' : '5000000'} autoFocus />
          {err && <p className="err-text">{err}</p>}
        </div>
        {current !== null && current !== undefined && <p className="auto-note">{t('blNow')}: {fmtW(wallet, current)}</p>}
        <p className="auto-note">💡 {t('blHint')}</p>
      </form>
    </Sheet>
  );
}
