import { useCallback, useEffect, useState } from 'react';
import Choice from './Choice.jsx';
import { taskApi } from '../lib/storage.js';
import { addDays, toISODate, todayISO } from '../lib/dates.js';
import { t } from '../lib/i18n.js';

const fmtD = (iso) => (iso ? `${iso.slice(8)}.${iso.slice(5, 7)}` : '');
const DUES = ['0', '1', '3', '7', 'n'];

// Hodimlarga vazifa berish: menga berilganlar, men berganlar, bajarilganlar
export default function TasksView() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);
  const [show, setShow] = useState('open');
  const [form, setForm] = useState(false);
  const [f, setF] = useState({ text: '', to: '', due: '1' });
  const [busy, setBusy] = useState(false);
  const today = todayISO();

  const run = useCallback(async (action, payload) => {
    setBusy(true);
    try {
      const r = await taskApi(action, payload);
      setData(r);
      setErr(false);
      return true;
    } catch {
      setErr(true);
      return false;
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => { run('tasks'); }, [run]);

  if (!data) return <section className="empty small"><h2>{err ? t('tkErr') : '…'}</h2></section>;
  const me = data.me, name = (id) => (data.members.find((m) => m.id === id) || {}).name || '';
  const all = data.tasks.filter((x) => (show === 'done' ? x.status === 'done' : x.status === 'open'));
  const groups = [['tkMine', all.filter((x) => x.to === me)], ['tkGiven', all.filter((x) => x.by === me && x.to !== me)], ['tkOthers', all.filter((x) => x.to !== me && x.by !== me)]];
  const submit = async (e) => {
    e.preventDefault();
    if (!f.text.trim()) return;
    const due = f.due === 'n' ? '' : toISODate(addDays(new Date(), Number(f.due)));
    if (await run('taskadd', { text: f.text.trim(), to: f.to || me, due })) { setF({ text: '', to: '', due: '1' }); setForm(false); }
  };
  const overdue = (x) => x.status === 'open' && x.due && x.due < today;

  return (
    <>
      <div className="ld-actions">
        <button type="button" className="btn btn-primary" onClick={() => setForm(!form)}>＋ {t('tkNew')}</button>
        <button type="button" className="btn btn-ghost" onClick={() => setShow(show === 'open' ? 'done' : 'open')}>{show === 'open' ? `✅ ${t('tkShowDone')}` : `📋 ${t('tkOpen')}`}</button>
      </div>

      {form && (
        <form className="panel tk-form" onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="tk-text">{t('tkText')}</label>
            <input id="tk-text" className="input" value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} maxLength={300} placeholder={t('tkTextPh')} autoFocus />
          </div>
          <div className="field">
            <span className="label-like">{t('tkTo')}</span>
            <Choice value={f.to || me} onChange={(v) => setF({ ...f, to: v })} options={data.members.map((m) => ({ v: m.id, label: m.id === me ? `${m.name} (${t('tkMe')})` : m.name }))} />
          </div>
          <div className="field">
            <span className="label-like">{t('tkDue')}</span>
            <Choice value={f.due} onChange={(v) => setF({ ...f, due: v })} options={DUES.map((k) => ({ v: k, label: t('tkDues')[k] }))} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy || !f.text.trim()}>{t('tkGive')}</button>
        </form>
      )}

      {all.length === 0 && <section className="empty small"><h2>{t('tkNone')}</h2></section>}
      {groups.map(([k, list]) => list.length > 0 && (
        <section key={k} className="tk-group">
          <h3>{t(k)} <span className="count">{list.length}</span></h3>
          <ul className="tk-list">
            {list.map((x) => (
              <li key={x.id} className={`${x.status === 'done' ? 'done' : ''}${overdue(x) ? ' over' : ''}`}>
                <span className="tk-main">
                  <b>{x.text}</b>
                  <small>
                    {k === 'tkMine' ? `${t('tkFrom')}: ${x.byName || name(x.by)}` : `${t('tkTo')}: ${x.toName || name(x.to)}`}
                    {x.due ? ` · ⏰ ${fmtD(x.due)}${x.time ? ` ${x.time}` : ''}${overdue(x) ? ' ⚠️' : ''}` : ''}
                    {x.status === 'done' && x.doneByName ? ` · ✅ ${x.doneByName}` : ''}
                  </small>
                </span>
                {x.status === 'open' && (x.to === me || x.by === me) && <button type="button" className="tk-ok" onClick={() => run('taskdone', { id: x.id })} disabled={busy} aria-label={t('tkDone')}>✓</button>}
                {x.by === me && <button type="button" className="icon-btn" onClick={() => run('taskdel', { id: x.id })} disabled={busy} aria-label={t('dDelete')}>✕</button>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
