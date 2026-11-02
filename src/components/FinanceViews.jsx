import Illustration from './Illustration.jsx';
import { money, owed } from '../lib/projects.js';
import { subDue, subPaidNow, subsMonthly } from '../lib/finance.js';
import { t } from '../lib/i18n.js';

export function ClientsList({ clients, onOpen }) {
  if (!clients.length) {
    return (
      <section className="empty-day">
        <Illustration />
        <h3>{t('clNone')}</h3>
        <p>{t('clNoneText')}</p>
      </section>
    );
  }
  return (
    <div className="cards">
      {clients.map((c, i) => (
        <div key={c.key} className="tl-item" style={{ '--i': i }}>
          <button type="button" className="pcard mini" onClick={() => onOpen(c.key)}>
            <span className="avatar">{c.name.slice(0, 1).toUpperCase()}</span>
            <span className="pc-main">
              <b>{c.name}</b>
              <small>{t('clProjects', c.projects.length)}{c.monthly ? ` · 🔁 ${money(c.monthly)}` : ''}</small>
            </span>
            {c.owed > 0 && <span className="owed-chip">{money(c.owed)}</span>}
          </button>
        </div>
      ))}
    </div>
  );
}

export function SubsList({ subs, today, onOpen, onAdd, onPay }) {
  return (
    <>
      <div className="debt-card sub-sum">
        <small>{t('fvSubs')}</small>
        <b>{money(subsMonthly(subs))}</b>
        <span>{t('subPerMonth')}</span>
      </div>
      {subs.length === 0 ? (
        <section className="empty-day">
          <Illustration />
          <h3>{t('subNone')}</h3>
          <p>{t('subNoneText')}</p>
        </section>
      ) : (
        <div className="cards">
          {[...subs].sort((a, b) => a.day - b.day).map((x, i) => {
            const due = subDue(x, today);
            const paid = subPaidNow(x, today);
            return (
              <div key={x.id} className="tl-item" style={{ '--i': i }}>
                <div className={`pcard mini sub-row${due ? ' due' : ''}${!x.active ? ' off' : ''}`}>
                  <button type="button" className="sub-main" onClick={() => onOpen(x.id)}>
                    <span className="ptile sub">{paid ? '✓' : '🔁'}</span>
                    <span className="pc-main">
                      <b>{[x.client, x.name].filter(Boolean).join(' · ')}</b>
                      <small>{money(x.amount)} · {!x.active ? t('subStPause') : paid ? t('subStPaid') : due ? t('subStDue') : t('subStWait', x.day)}</small>
                    </span>
                  </button>
                  {due && <button type="button" className="btn btn-accent add-btn" onClick={() => onPay(x.id)}>✓</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <button type="button" className="btn btn-primary wide-add" onClick={onAdd}>+ {t('subAdd')}</button>
    </>
  );
}

export const clientDebt = (projects) => projects.reduce((n, p) => n + owed(p), 0);
