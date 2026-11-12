import DateField from './DateField.jsx';
import { useId, useState } from 'react';
import Sheet from './Sheet.jsx';
import Choice from './Choice.jsx';
import { IconCheck, IconClose } from './Icons.jsx';
import { addMonths, digits, fullUrl, serviceDays, serviceElapsed, serviceEnd, svKind, tgPhoneLink } from '../lib/services.js';
import { formatFull, formatShort, todayISO, toISODate } from '../lib/dates.js';
import { openExternal, openTelegramLink } from '../lib/telegram.js';
import { t } from '../lib/i18n.js';

const MONTHS = [3, 6, 12, 24, 36];

export default function ServiceSheet({ service: x, fromProject, onSeo, onPrompt, onMsg, onLinkCheck, onAddChange, onRemoveChange, onSave, onDelete, onAddRequest, onToggleRequest, onRemoveRequest, onClose }) {
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
  const [seoBusy, setSeoBusy] = useState(false);
  const [seoRes, setSeoRes] = useState(null);
  const [box, setBox] = useState(null); // { title, text }
  const [busyReq, setBusyReq] = useState('');
  const [chg, setChg] = useState('');
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkRes, setLinkRes] = useState('');
  const doLink = async () => {
    setLinkBusy(true);
    try {
      const r = await onLinkCheck(x.id);
      setLinkRes(r.status);
    } catch {
      setLinkRes('error');
    } finally {
      setLinkBusy(false);
    }
  };
  const addChg = () => {
    const v = chg.trim();
    if (!v) return;
    onAddChange(v);
    setChg('');
  };
  const showReport = () => {
    const from = toISODate(new Date(Date.now() - 90 * 86400000));
    const list = x.changes.filter((c) => c.d >= from);
    setBox({ title: t('svHistReport'), text: list.length ? t('svReportText', x.name, list.map((c, i) => `${i + 1}. ${formatShort(c.d)} — ${c.text}`).join('\n'), 90) : t('svHistNone') });
  };
  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  };
  const doSeo = async () => {
    setSeoBusy(true);
    setSeoRes(null);
    try {
      const r = await onSeo(x.id);
      setSeoRes(r);
      if (r.prompt) setBox({ title: t('svFixTask'), text: r.prompt });
    } catch {
      setSeoRes({ error: true });
    } finally {
      setSeoBusy(false);
    }
  };
  const doPrompt = async (rid) => {
    setBusyReq(rid);
    try {
      const r = await onPrompt(x.id, rid);
      setBox({ title: r.ai ? t('svPromptAi') : t('svPromptTpl'), text: r.text });
    } catch {
      setBox({ title: t('svSeoFail'), text: '' });
    } finally {
      setBusyReq('');
    }
  };
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

          <div className="link-status">
            <span>🤖 {!x.claudeUrl ? t('clStatus').missing : !/^https:\/\/([\w-]+\.)?claude\.(ai|com)\/\S+/i.test(x.claudeUrl) ? t('clStatus').format : (linkRes || x.cl?.s) ? t('clStatus')[linkRes || x.cl.s] : t('clStatus').none}</span>
            {x.claudeUrl && <button type="button" className="link-btn" onClick={doLink} disabled={linkBusy}>{linkBusy ? '…' : t('svLinkCheck')}</button>}
            <button type="button" className="link-btn" onClick={onMsg}>✉️ {t('msgBtn')}</button>
          </div>

          {x.url && (
            <div className="seo-box">
              <div className="seo-head">
                <b>🔎 SEO</b>
                {(seoRes && !seoRes.error && !seoRes.down ? { score: seoRes.score } : x.seo) && (
                  <span className={`seo-score ${((seoRes && seoRes.score) ?? x.seo.score) >= 80 ? 'ok' : ((seoRes && seoRes.score) ?? x.seo.score) >= 55 ? 'mid' : 'bad'}`}>{(seoRes && seoRes.score) ?? x.seo.score}/100</span>
                )}
                <button type="button" className="act-chip" onClick={doSeo} disabled={seoBusy}>{seoBusy ? t('svSeoRun') : t('svSeo')}</button>
              </div>
              {seoRes && seoRes.error && <p className="err-text">{t('svSeoFail')}</p>}
              {seoRes && seoRes.down && <p className="err-text">{t('svSeoFail')}</p>}
              {seoRes && seoRes.lines && seoRes.lines.length > 0 && (
                <ul className="seo-list">
                  {seoRes.lines.map((l, i) => <li key={i} className={l.ok ? 'ok' : 'bad'}><span>{l.ok ? '✓' : '!'}</span>{l.text}</li>)}
                </ul>
              )}
            </div>
          )}

          {box && (
            <div className="prompt-box">
              <div className="seo-head"><b>{box.title}</b><button type="button" className="icon-btn" onClick={() => setBox(null)} aria-label={t('fCancel')}>✕</button></div>
              {box.text && (
                <>
                  <textarea className="input" readOnly rows={7} value={box.text} onFocus={(e) => e.target.select()} />
                  <button type="button" className="btn btn-primary bot-btn" onClick={async () => { (await copy(box.text)) ? setBox((b) => ({ ...b, copied: true })) : null; }}>{box.copied ? `✓ ${t('svCopied')}` : t('svCopy')}</button>
                </>
              )}
            </div>
          )}

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
                  {!r.done && <button type="button" className="icon-btn sv-prompt" onClick={() => doPrompt(r.id)} disabled={busyReq === r.id} aria-label={t('svPromptBtn')}>{busyReq === r.id ? '…' : '🤖'}</button>}
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

          <div className="section-title">
            <h4>{t('svHistory')}</h4>
            <span className="count">{x.changes.length}</span>
          </div>
          {x.changes.length > 0 && (
            <ul className="list">
              {[...x.changes].reverse().slice(0, 12).map((c) => (
                <li key={c.id} className="task-row">
                  <span className="todo"><span className="todo-text">{c.text}</span></span>
                  <span className="due">{formatShort(c.d)}</span>
                  <button type="button" className="icon-btn" onClick={() => onRemoveChange(c.id)} aria-label={t('fRemoveItem')}><IconClose width={16} height={16} /></button>
                </li>
              ))}
            </ul>
          )}
          <div className="add-row" style={{ marginTop: 10 }}>
            <input className="input" value={chg} onChange={(e) => setChg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChg())} placeholder={t('svChgPh')} maxLength={200} enterKeyHint="done" />
            <button type="button" className="btn btn-accent add-btn" onClick={addChg}>{t('fAddItem')}</button>
          </div>
          <div className="shift-row" style={{ marginTop: 10 }}>
            <button type="button" className="act-chip" onClick={showReport}>📋 {t('svHistReport')}</button>
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
              <DateField id={`${uid}-d`} value={f.doneAt} onChange={(v) => setF((p) => ({ ...p, doneAt: v }))} />
            </div>
            <div className="field">
              <span className="label-like">{t('svPeriod')}</span>
              <Choice value={f.months} onChange={(v) => setF((p) => ({ ...p, months: v }))} options={[...new Set([...MONTHS, Number(f.months)])].sort((a, b) => a - b).map((m) => ({ v: m, label: t('svMonths', m) }))} />
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
