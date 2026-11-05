import { useId, useState } from 'react';
import Sheet from './Sheet.jsx';
import { IconCheck, IconClose } from './Icons.jsx';
import { addMonths, digits, fullUrl, serviceDays, serviceElapsed, serviceEnd, svKind, tgPhoneLink } from '../lib/services.js';
import { formatFull, formatShort, todayISO } from '../lib/dates.js';
import { openExternal, openTelegramLink } from '../lib/telegram.js';
import { t } from '../lib/i18n.js';

const MONTHS = [3, 6, 12, 24, 36];

export default function ServiceSheet({ service: x, fromProject, onSave, onDelete, onAddRequest, onToggleRequest, onRemoveRequest, onClose }) {
  const uid = useId();
  const today = todayISO();
  const [editing, setEditing] = useState(!x);
  const [text, setText] = useState('');
  const [f, setF] = useState(() => ({
    name: x?.name ?? fromProject?.name ?? '',
    client: x?.client ?? fromProject?.client ?? '',
    phone: x?.phone ?? fromProject?.contact ?? '',
    url: x?.url ?? fromProject?.url ?? '',
    claudeUrl: x?.claudeUrl ?? '',
    doneAt: x?.doneAt ?? today,
    months: x?.months ?? 12,
    notes: x?.notes ?? '',
  }));
  const [err, setErr] = useState('');
  const set = (k) => (e) => {
    setF((p) => ({ ...p, [k]: e.target.value }));
    setErr('');
  };
  const submit = (e) => {
    e.preventDefault();
    if (!f.name.trim()) return setErr(t('eName'));
    onSave({ ...f, name: f.name.trim(), client: f.client.trim(), phone: f.phone.trim(), url: f.url.trim(), claudeUrl: f.claudeUrl.trim(), months: Number(f.months) || 12, doneAt: f.doneAt || today });
    if (x) setEditing(false);
  };
  const add = () => {
    const v = text.trim();
    if (!v) return;
    onAddRequest(v);
    setText('');
  };
  const formId = `${uid}-form`;
  const d = x ? serviceDays(x, today) : 0;
  const kind = x ? svKind(d) : '';
  const tel = x && digits(x.phone).length >= 7 ? `+${digits(x.phone)}` : '';
  const tgLink = x ? tgPhoneLink(x.phone) : '';

  return (
    <Sheet
      title={x ? t('svTitle') : t('svNew')}
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
          <div className={`d-hero sv-hero k-${kind}`}>
            <h3 className="d-name">{x.name}</h3>
            <p className="d-status">{[x.client, x.phone].filter(Boolean).join(' · ')}</p>
            <p className="sv-big">{t('svLeft', d)}</p>
            <span className="bar big"><i style={{ width: `${Math.round(serviceElapsed(x, today) * 100)}%` }} /></span>
            <p className="d-status">{t('svDone')}: {formatShort(x.doneAt)} · {t('svEnds')}: {formatFull(serviceEnd(x))}</p>
          </div>

          <div className="sv-actions">
            <button type="button" className="sv-act primary" disabled={!x.claudeUrl} onClick={() => openExternal(fullUrl(x.claudeUrl))}>
              <span>🤖</span><b>{t('svClaude')}</b><small>{x.claudeUrl ? t('svClaudeHint') : t('svNoClaude')}</small>
            </button>
            <button type="button" className="sv-act" disabled={!x.url} onClick={() => openExternal(fullUrl(x.url))}>
              <span>🌐</span><b>{t('svSite')}</b><small>{x.url ? x.url.replace(/^https?:\/\//i, '') : t('svNoSite')}</small>
            </button>
            <a className={`sv-act${tel ? '' : ' disabled'}`} href={tel ? `tel:${tel}` : undefined}>
              <span>📞</span><b>{t('dCall')}</b><small>{x.phone || '—'}</small>
            </a>
            <button type="button" className="sv-act" disabled={!tgLink} onClick={() => openTelegramLink(tgLink)}>
              <span>✈️</span><b>Telegram</b><small>{tgLink ? t('svWrite') : '—'}</small>
            </button>
          </div>

          <div className="section-title">
            <h4>{t('svRequests')}</h4>
            <span className="count">{x.requests.filter((r) => r.done).length}/{x.requests.length}</span>
          </div>
          {x.requests.length > 0 && (
            <ul className="list">
              {[...x.requests].reverse().map((r) => (
                <li key={r.id} className="task-row">
                  <button type="button" role="checkbox" aria-checked={r.done} className="todo" onClick={() => onToggleRequest(r.id)}>
                    <span className="box">{r.done && <IconCheck width={16} height={16} strokeWidth={3} />}</span>
                    <span className="todo-text">{r.text}</span>
                  </button>
                  <span className="due">{formatShort(r.d)}</span>
                  <button type="button" className="icon-btn" onClick={() => onRemoveRequest(r.id)} aria-label={t('fRemoveItem')}>
                    <IconClose width={16} height={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="add-row" style={{ marginTop: 10 }}>
            <input className="input" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} placeholder={t('svReqPh')} maxLength={200} enterKeyHint="done" />
            <button type="button" className="btn btn-accent add-btn" onClick={add}>{t('fAddItem')}</button>
          </div>

          {x.notes && (
            <>
              <div className="section-title"><h4>{t('dNotes')}</h4></div>
              <p className="notes">{x.notes}</p>
            </>
          )}
        </>
      )}

      {editing && (
        <form id={formId} onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor={`${uid}-n`}>{t('svName')}</label>
            <input id={`${uid}-n`} className={`input${err ? ' err' : ''}`} value={f.name} onChange={set('name')} maxLength={120} />
            {err && <p className="err-text">{err}</p>}
          </div>
          <div className="row2">
            <div className="field">
              <label htmlFor={`${uid}-c`}>{t('sfClient')}</label>
              <input id={`${uid}-c`} className="input" value={f.client} onChange={set('client')} maxLength={100} />
            </div>
            <div className="field">
              <label htmlFor={`${uid}-p`}>{t('svPhone')}</label>
              <input id={`${uid}-p`} className="input" type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="+998 90 123 45 67" maxLength={30} />
            </div>
          </div>
          <div className="field">
            <label htmlFor={`${uid}-u`}>{t('svUrl')}</label>
            <input id={`${uid}-u`} className="input" type="url" inputMode="url" autoCapitalize="none" value={f.url} onChange={set('url')} placeholder="kafenavo.uz" />
          </div>
          <div className="field">
            <label htmlFor={`${uid}-cl`}>{t('svClaudeUrl')}</label>
            <input id={`${uid}-cl`} className="input" type="url" inputMode="url" autoCapitalize="none" value={f.claudeUrl} onChange={set('claudeUrl')} placeholder="https://claude.ai/code/..." />
          </div>
          <div className="row2">
            <div className="field">
              <label htmlFor={`${uid}-d`}>{t('svDone')}</label>
              <input id={`${uid}-d`} className="input" type="date" value={f.doneAt} onChange={set('doneAt')} />
            </div>
            <div className="field">
              <label htmlFor={`${uid}-m`}>{t('svPeriod')}</label>
              <select id={`${uid}-m`} className="input" value={f.months} onChange={set('months')}>
                {[...new Set([...MONTHS, Number(f.months)])].sort((a, b) => a - b).map((m) => <option key={m} value={m}>{t('svMonths', m)}</option>)}
              </select>
            </div>
          </div>
          <p className="auto-note">{t('svEnds')}: {formatFull(addMonths(f.doneAt || today, Number(f.months) || 12))}</p>
          <div className="field">
            <label htmlFor={`${uid}-no`}>{t('pfNotes')}</label>
            <textarea id={`${uid}-no`} className="input" rows={3} value={f.notes} onChange={set('notes')} maxLength={1000} />
          </div>
        </form>
      )}
    </Sheet>
  );
}
