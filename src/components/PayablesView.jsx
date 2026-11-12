import { useMemo } from 'react';
import Illustration from './Illustration.jsx';
import { dueKind, left, summary } from '../lib/payables.js';
import { money } from '../lib/projects.js';
import { formatShort } from '../lib/dates.js';
import { t } from '../lib/i18n.js';

const tagText = (k) => (k.kind === 'over' ? t('pvOverdue', -k.n) : k.kind === 'today' ? t('pvToday') : k.n === 1 ? t('pvTomorrow') : t('pvIn', k.n));

export default function PayablesView({ payables, projects, subs, today, onOpen, onAdd, onPay }) {
  const s = useMemo(() => summary(payables, projects, subs, today), [payables, projects, subs, today]);
  const groups = useMemo(() => {
    const g = { over: [], today: [], week: [], later: [] };
    for (const x of s.open) {
      const k = dueKind(x, today);
      (k.kind === 'over' ? g.over : k.kind === 'today' ? g.today : k.n <= 7 ? g.week : g.later).push({ x, k });
    }
    return g;
  }, [s.open, today]);
  return (
    <>
      <div className="debt-card pay-sum">
        <small>{t('pvTotal')}</small>
        <b>{money(s.total)}</b>
        <span>{s.overdue > 0 ? `⚠️ ${t('pvOverSum')}: ${money(s.overdue)} · ` : ''}{t('pvWeekSum')}: {money(s.week)}</span>
      </div>

      {s.open.length > 0 && (
        <div className="forecast">
          <b>🔮 {t('pvForecast')}</b>
          <div><span>{t('pvInflow')}</span><em>{money(s.inflow)}</em></div>
          <div><span>{t('pvOut30')}</span><em>{money(s.out30)}</em></div>
          <div className={s.balance >= 0 ? 'ok' : 'bad'}><span>{t('pvBalance')}</span><em>{s.balance < 0 ? '−' : ''}{money(Math.abs(s.balance))} {s.balance >= 0 ? '✓' : '⚠️'}</em></div>
        </div>
      )}

      {s.open.length === 0 ? (
        <section className="empty-day">
          <Illustration />
          <h3>{t('pvNone')}</h3>
          <p>{t('pvNoneText')}</p>
        </section>
      ) : (
        ['over', 'today', 'week', 'later'].filter((k) => groups[k].length).map((k) => (
          <section key={k} className="pay-group">
            <div className="section-title"><h4>{t('pvGroups')[k]}</h4><span className="count">{groups[k].length}</span></div>
            <div className="cards">
              {groups[k].map(({ x, k: dk }, i) => (
                <div key={x.id} className="tl-item" style={{ '--i': i }}>
                  <div className={`pcard mini pay-row k-${dk.kind}`}>
                    <button type="button" className="sub-main" onClick={() => onOpen(x.id)}>
                      <span className="ptile pay">💸</span>
                      <span className="pc-main">
                        <b>{x.who}{x.repeat ? ' 🔁' : ''}</b>
                        <small>{x.note || t('exCats')[x.cat]} · {formatShort(x.due)}</small>
                        <small className={`pay-left k-${dk.kind}`}>{money(left(x))} · {tagText(dk)}</small>
                      </span>
                    </button>
                    <button type="button" className="btn btn-accent add-btn pay-ok" onClick={() => onPay(x.id)} aria-label={t('pvPaidBtn')}>✓</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
      {s.byWho.length > 1 && (
        <>
          <div className="section-title"><h4>{t('pvByWho')}</h4></div>
          <ul className="pay-list">
            {s.byWho.slice(0, 8).map(([w, a]) => <li key={w}><span>{w}</span><b>{money(a)}</b></li>)}
          </ul>
        </>
      )}
      <button type="button" className="btn btn-primary wide-add" onClick={onAdd}>+ {t('pvAdd')}</button>
    </>
  );
}
