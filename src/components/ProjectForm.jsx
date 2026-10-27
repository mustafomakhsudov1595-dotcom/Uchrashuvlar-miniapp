import { useId, useState } from 'react';
import Sheet from './Sheet.jsx';
import { TypeIcon } from './ProjectCard.jsx';
import { PTYPES, shiftDate, templateCount } from '../lib/projects.js';
import { todayISO } from '../lib/dates.js';
import { t } from '../lib/i18n.js';

export default function ProjectForm({ initial, presetType, onSave, onClose }) {
  const uid = useId();
  const [f, setF] = useState(() => ({
    name: initial?.name ?? '',
    type: initial?.type ?? presetType ?? 'site',
    client: initial?.client ?? '',
    contact: initial?.contact ?? '',
    date: initial?.date ?? shiftDate(todayISO(), 14),
    time: initial?.time ?? '18:00',
    price: initial?.price ?? '',
    paid: initial?.paid ?? '',
    notes: initial?.notes ?? '',
  }));
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => {
    setF((p) => ({ ...p, [k]: e.target.value }));
    setErrors((p) => (p[k] ? { ...p, [k]: undefined } : p));
  };
  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!f.name.trim()) errs.name = t('eName');
    if (!f.date) errs.date = t('eDate');
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const num = (v) => (v === '' || v === null || !Number.isFinite(Number(v)) ? null : Math.max(0, Number(v)));
    onSave({ name: f.name.trim(), type: f.type, client: f.client.trim(), contact: f.contact.trim(), date: f.date, time: f.time || '18:00', price: num(f.price), paid: num(f.paid), notes: f.notes.trim() });
  };
  const formId = `${uid}-form`;

  return (
    <Sheet
      title={initial ? t('pfEdit') : t('pfNew')}
      onClose={onClose}
      tall
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
          <span className="label-like">{t('pfType')}</span>
          <div className="type-grid">
            {PTYPES.map((k) => (
              <button type="button" key={k} className={`type-btn pt-${k}${f.type === k ? ' on' : ''}`} onClick={() => setF((p) => ({ ...p, type: k }))} aria-pressed={f.type === k}>
                <span className="ptile"><TypeIcon type={k} width={22} height={22} /></span>
                <b>{t('pTypes')[k]}</b>
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor={`${uid}-n`}>{t('pfName')}</label>
          <input id={`${uid}-n`} className="input" value={f.name} onChange={set('name')} placeholder={t('pfNamePh')} maxLength={120} autoComplete="off" aria-invalid={Boolean(errors.name)} />
          {errors.name && <span className="error">{errors.name}</span>}
        </div>

        <div className="field">
          <label htmlFor={`${uid}-c`}>{t('pfClient')}</label>
          <input id={`${uid}-c`} className="input" value={f.client} onChange={set('client')} placeholder={t('pfClientPh')} maxLength={100} autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor={`${uid}-ct`}>{t('pfContact')}</label>
          <input id={`${uid}-ct`} className="input" value={f.contact} onChange={set('contact')} placeholder={t('pfContactPh')} maxLength={60} autoComplete="off" />
        </div>

        <div className="row2">
          <div className="field">
            <label htmlFor={`${uid}-d`}>{t('pfDeadline')}</label>
            <input id={`${uid}-d`} type="date" className="input" value={f.date} onChange={set('date')} aria-invalid={Boolean(errors.date)} />
            {errors.date && <span className="error">{errors.date}</span>}
          </div>
          <div className="field">
            <label htmlFor={`${uid}-t`}>{t('pfTime')}</label>
            <input id={`${uid}-t`} type="time" className="input" value={f.time} onChange={set('time')} />
          </div>
        </div>
        {!initial && <p className="auto-note">{templateCount(f.type) ? t('pfAuto', templateCount(f.type)) : t('pfAutoOff')}</p>}

        <div className="row2">
          <div className="field">
            <label htmlFor={`${uid}-p`}>{t('pfPrice')}</label>
            <input id={`${uid}-p`} className="input" type="number" inputMode="numeric" min="0" value={f.price} onChange={set('price')} placeholder="3000000" />
          </div>
          <div className="field">
            <label htmlFor={`${uid}-pd`}>{t('pfPaid')}</label>
            <input id={`${uid}-pd`} className="input" type="number" inputMode="numeric" min="0" value={f.paid} onChange={set('paid')} placeholder="0" />
          </div>
        </div>

        <div className="field">
          <label htmlFor={`${uid}-no`}>{t('pfNotes')}</label>
          <textarea id={`${uid}-no`} className="input" rows={3} value={f.notes} onChange={set('notes')} maxLength={1500} />
        </div>
      </form>
    </Sheet>
  );
}
