import { useId, useState } from 'react';
import Sheet from './Sheet.jsx';
import { EXCATS } from '../lib/storage.js';
import { dueKind, left, shiftDays } from '../lib/payables.js';
import { money } from '../lib/projects.js';
import { formatFull, formatShort, todayISO } from '../lib/dates.js';
import { t } from '../lib/i18n.js';

export default function PayableSheet({ item: x, projects, onSave, onPay, onUndo, onSnooze, onDelete, onClose }) {
  const uid = useId();
  const today = todayISO();
  const [editing, setEditing] = useState(!x);
  const [part, setPart] = useState('');
  const [err, setErr] = useState('');
  const [f, setF] = useState(() => ({ who: x?.who ?? '', note: x?.note ?? '', amount: x?.amount ?? '', due: x?.due ?? today, cat: x?.cat ?? 'team', repeat: x?.repeat === 'month', pid: x?.pid ?? '' }));
  const set = (k) => (e) => {
    setF((p) => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
    setErr('');
  };
  const submit = (e) => {
    e.preventDefault();
    if (!f.who.trim()) return setErr(t('pvEWho'));
    if (!(Number(f.amount) > 0)) return setErr(t('eAmount'));
    onSave({ who: f.who.trim(), note: f.note.trim(), amount: Math.round(Number(f.amount)), due: f.due || today, cat: f.cat, repeat: f.repeat ? 'month' : '', pid: f.pid });
    if (x) setEditing(false);
  };
  const addPart = () => {
    const a = Math.round(Number(part));
    if (!(a > 0)) return;
    onPay(a);
    setPart('');
  };
  const formId = `${uid}-form`;
  const l = x ? left(x) : 0;
  const k = x ? dueKind(x, today) : null;

  return (
    <Sheet
      title={x ? t('pvTitle') : t('pvNew')}
      onClose={onClose}
      tall
      dismissOnOverlay={false}
      footer={
        editing ? (
          <>
            <button key="cancel" type="button" className="btn btn-ghost" onClick={() => (x ? setEditing(false) : onClose())}>{t('fCancel')}</button>
            <button key="save" type="submit" form={formId} className="btn btn-primary">{t('fSave')}</button>
          </>
        ) : (
          <>
            <button key="del" type="button" className="btn btn-danger" onClick={onDelete}>{t('dDelete')}</button>
            <button key="edit" type="button" className="btn btn-primary" onClick={() => setEditing(true)}>{t('dEdit')}</button>
          </>
        )
      }
    >
      {x && !editing && (
        <>
          <div className={`sub-hero pay-hero k-${l === 0 ? 'done' : k.kind}`}>
            <b>{money(l)}</b>
            <span>{x.who}{x.note ? ` · ${x.note}` : ''}</span>
            <span>{t('pvDue')}: {formatFull(x.due)}{l > 0 ? ` · ${k.kind === 'over' ? t('pvOverdue', -k.n) : k.kind === 'today' ? t('pvToday') : k.n === 1 ? t('pvTomorrow') : t('pvIn', k.n)}` : ''}</span>
            <span className="bar big"><i style={{ width: `${Math.min(100, (x.paid / x.amount) * 100)}%` }} /></span>
            <em>{l === 0 ? `✓ ${t('pvDone')}` : `${t('pvPaidOf')}: ${money(x.paid)} / ${money(x.amount)}`}{x.repeat ? ' · 🔁' : ''}</em>
          </div>

          {l > 0 && (
            <>
              <button type="button" className="btn btn-primary bot-btn" onClick={() => onPay(l)}>✓ {t('pvPaidBtn')} · {money(l)}</button>
              <div className="add-row" style={{ marginTop: 10 }}>
                <input className="input" type="number" inputMode="numeric" min="0" value={part} onChange={(e) => setPart(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPart())} placeholder={t('pvPartPh')} enterKeyHint="done" />
                <button type="button" className="btn btn-accent add-btn" onClick={addPart} style={{ whiteSpace: 'nowrap' }}>{t('pvPart')}</button>
              </div>
              <div className="shift-row" style={{ marginTop: 10 }}>
                <button type="button" className="act-chip" onClick={() => onSnooze(shiftDays(x.due < today ? today : x.due, 3))}>⏰ +3 {t('pvDays')}</button>
              </div>
            </>
          )}

          {x.pays.length > 0 && (
            <>
              <div className="section-title"><h4>{t('pvHistory')}</h4><button type="button" className="link-btn" onClick={onUndo}>↩ {t('pvUndo')}</button></div>
              <ul className="pay-list">
                {[...x.pays].reverse().slice(0, 8).map((y) => <li key={y.id}><span>{formatShort(y.d)}</span><b>−{money(y.a)}</b></li>)}
              </ul>
            </>
          )}
        </>
      )}

      {editing && (
        <form id={formId} onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor={`${uid}-w`}>{t('pvWho')}</label>
            <input id={`${uid}-w`} className={`input${err ? ' err' : ''}`} value={f.who} onChange={set('who')} maxLength={80} placeholder="Sardor" autoFocus={!x} />
          </div>
          <div className="field">
            <label htmlFor={`${uid}-n`}>{t('pvNote')}</label>
            <input id={`${uid}-n`} className="input" value={f.note} onChange={set('note')} maxLength={120} placeholder={t('pvNotePh')} />
          </div>
          <div className="row2">
            <div className="field">
              <label htmlFor={`${uid}-a`}>{t('pvAmount')}</label>
              <input id={`${uid}-a`} className="input" type="number" inputMode="numeric" min="0" value={f.amount} onChange={set('amount')} placeholder="1500000" />
            </div>
            <div className="field">
              <label htmlFor={`${uid}-d`}>{t('pvDue')}</label>
              <input id={`${uid}-d`} className="input" type="date" value={f.due} onChange={set('due')} />
            </div>
          </div>
          {err && <p className="err-text">{err}</p>}
          <div className="field">
            <span className="label-like">{t('exCat')}</span>
            <div className="cat-chips wrap">
              {EXCATS.map((c) => (
                <button type="button" key={c} className={`cat-chip${f.cat === c ? ' on' : ''}`} onClick={() => setF((p) => ({ ...p, cat: c }))} aria-pressed={f.cat === c}>{t('exCats')[c]}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor={`${uid}-p`}>{t('exProject')}</label>
            <select id={`${uid}-p`} className="input" value={f.pid} onChange={set('pid')}>
              <option value="">—</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <label className="check-line">
            <input type="checkbox" checked={f.repeat} onChange={set('repeat')} />
            <span>🔁 {t('pvRepeat')}</span>
          </label>
        </form>
      )}
    </Sheet>
  );
}
