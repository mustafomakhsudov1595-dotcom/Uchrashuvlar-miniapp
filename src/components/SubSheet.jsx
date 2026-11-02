import { useId, useState } from 'react';
import Sheet from './Sheet.jsx';
import { subDue, subPaidNow } from '../lib/finance.js';
import { money } from '../lib/projects.js';
import { formatShort, todayISO } from '../lib/dates.js';
import { t } from '../lib/i18n.js';

export default function SubSheet({ sub, clientNames, onSave, onPay, onToggle, onDelete, onClose }) {
  const uid = useId();
  const [f, setF] = useState(() => ({ name: sub?.name ?? '', client: sub?.client ?? '', amount: sub?.amount ?? '', day: sub?.day ?? 1 }));
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => {
    setF((p) => ({ ...p, [k]: e.target.value }));
    setErrors((p) => (p[k] ? { ...p, [k]: undefined } : p));
  };
  const today = todayISO();
  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!f.name.trim()) errs.name = t('eName');
    if (!(Number(f.amount) > 0)) errs.amount = t('eAmount');
    setErrors(errs);
    if (Object.keys(errs).length) return;
    onSave({ name: f.name.trim(), client: f.client.trim(), amount: Math.round(Number(f.amount)), day: Math.min(28, Math.max(1, Math.round(Number(f.day) || 1))) });
  };
  const formId = `${uid}-form`;
  const status = !sub ? '' : !sub.active ? t('subStPause') : subPaidNow(sub, today) ? t('subStPaid') : subDue(sub, today) ? t('subStDue') : t('subStWait', sub.day);
  const kind = !sub ? '' : !sub.active ? 'off' : subPaidNow(sub, today) ? 'ok' : subDue(sub, today) ? 'due' : 'wait';

  return (
    <Sheet
      title={sub ? t('sfEdit') : t('sfNew')}
      onClose={onClose}
      tall
      dismissOnOverlay={false}
      footer={
        <>
          {sub ? <button type="button" className="btn btn-danger" onClick={onDelete}>{t('dDelete')}</button> : <button type="button" className="btn btn-ghost" onClick={onClose}>{t('fCancel')}</button>}
          <button type="submit" form={formId} className="btn btn-primary">{t('fSave')}</button>
        </>
      }
    >
      {sub && (
        <div className={`sub-hero st-${kind}`}>
          <b>{money(sub.amount)}</b>
          <span>{t('subPerMonth')} · {t('subDay', sub.day)}</span>
          <em>{status}</em>
        </div>
      )}
      {sub && (
        <div className="shift-row" style={{ marginBottom: 14 }}>
          {sub.active && !subPaidNow(sub, today) && <button type="button" className="act-chip on" onClick={onPay}>✓ {t('subPaidBtn')}</button>}
          <button type="button" className="act-chip" onClick={onToggle}>{sub.active ? t('subPause') : t('subResume')}</button>
        </div>
      )}
      <form id={formId} onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor={`${uid}-n`}>{t('sfName')}</label>
          <input id={`${uid}-n`} className={`input${errors.name ? ' err' : ''}`} value={f.name} onChange={set('name')} maxLength={80} />
          {errors.name && <p className="err-text">{errors.name}</p>}
        </div>
        <div className="field">
          <label htmlFor={`${uid}-c`}>{t('sfClient')}</label>
          <input id={`${uid}-c`} className="input" list={`${uid}-cl`} value={f.client} onChange={set('client')} maxLength={100} />
          <datalist id={`${uid}-cl`}>{clientNames.map((n) => <option key={n} value={n} />)}</datalist>
        </div>
        <div className="row2">
          <div className="field">
            <label htmlFor={`${uid}-a`}>{t('sfAmount')}</label>
            <input id={`${uid}-a`} className={`input${errors.amount ? ' err' : ''}`} type="number" inputMode="numeric" min="0" value={f.amount} onChange={set('amount')} placeholder="500000" />
            {errors.amount && <p className="err-text">{errors.amount}</p>}
          </div>
          <div className="field">
            <label htmlFor={`${uid}-d`}>{t('sfDay')}</label>
            <input id={`${uid}-d`} className="input" type="number" inputMode="numeric" min="1" max="28" value={f.day} onChange={set('day')} />
          </div>
        </div>
      </form>
      {sub && (sub.pays || []).length > 0 && (
        <>
          <div className="section-title"><h4>{t('subHist')}</h4></div>
          <ul className="pay-list">
            {[...sub.pays].reverse().slice(0, 8).map((x, i) => (
              <li key={`${x.d}-${i}`}><span>{formatShort(x.d)}</span><b>+{money(x.a)}</b></li>
            ))}
          </ul>
        </>
      )}
    </Sheet>
  );
}
