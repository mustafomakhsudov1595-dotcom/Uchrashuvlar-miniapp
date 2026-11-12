import DateField from './DateField.jsx';
import { useId, useState } from 'react';
import Sheet from './Sheet.jsx';
import Choice from './Choice.jsx';
import { EXCATS } from '../lib/storage.js';
import { todayISO } from '../lib/dates.js';
import { t } from '../lib/i18n.js';

export default function ExpenseSheet({ projects, onSave, onClose }) {
  const uid = useId();
  const [f, setF] = useState({ a: '', cat: 'ads', note: '', pid: '', d: todayISO() });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const submit = (e) => {
    e.preventDefault();
    if (!(Number(f.a) > 0)) return setErr(t('eAmount'));
    onSave({ a: Math.round(Number(f.a)), cat: f.cat, note: f.note.trim(), pid: f.pid, d: f.d || todayISO() });
  };
  const formId = `${uid}-form`;
  return (
    <Sheet
      title={t('exNew')}
      onClose={onClose}
      dismissOnOverlay={false}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>{t('fCancel')}</button>
          <button type="submit" form={formId} className="btn btn-primary">{t('fSave')}</button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor={`${uid}-a`}>{t('exAmount')}</label>
          <input id={`${uid}-a`} className={`input${err ? ' err' : ''}`} type="number" inputMode="numeric" min="0" value={f.a} onChange={(e) => { set('a')(e); setErr(''); }} placeholder="150000" autoFocus />
          {err && <p className="err-text">{err}</p>}
        </div>
        <div className="field">
          <span className="label-like">{t('exCat')}</span>
          <div className="cat-chips wrap">
            {EXCATS.map((k) => (
              <button type="button" key={k} className={`cat-chip${f.cat === k ? ' on' : ''}`} onClick={() => setF((p) => ({ ...p, cat: k }))} aria-pressed={f.cat === k}>{t('exCats')[k]}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor={`${uid}-n`}>{t('exNote')}</label>
          <input id={`${uid}-n`} className="input" value={f.note} onChange={set('note')} maxLength={100} />
        </div>
        <div className="row2">
          <div className="field">
            <span className="label-like">{t('exProject')}</span>
            <Choice value={f.pid} onChange={(v) => setF((p) => ({ ...p, pid: v }))} options={[{ v: '', label: t('exNoProject') }, ...projects.map((p) => ({ v: p.id, label: p.name }))]} />
          </div>
          <div className="field">
            <label htmlFor={`${uid}-d`}>{t('exDate')}</label>
            <DateField id={`${uid}-d`} value={f.d} onChange={(v) => setF((p) => ({ ...p, d: v }))} />
          </div>
        </div>
      </form>
    </Sheet>
  );
}
