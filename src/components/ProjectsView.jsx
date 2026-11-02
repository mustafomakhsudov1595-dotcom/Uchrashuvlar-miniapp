import { useMemo, useState } from 'react';
import ProjectCard, { TypeIcon } from './ProjectCard.jsx';
import Illustration from './Illustration.jsx';
import { ClientsList, SubsList } from './FinanceViews.jsx';
import { IconSettings } from './Icons.jsx';
import { byDeadline, PTYPES, urgency, owed, money } from '../lib/projects.js';
import { toISODate } from '../lib/dates.js';
import { clientsOf } from '../lib/finance.js';
import { t } from '../lib/i18n.js';

export default function ProjectsView({ projects, subs, now, onOpen, onAdd, onDone, onDelete, onSettings, onOpenClient, onOpenSub, onAddSub, onPaySub }) {
  const [view, setView] = useState('projects'); // projects | clients | subs
  const [type, setType] = useState('');
  const [flt, setFlt] = useState(''); // '' | soon | over
  const today = toISODate(now);

  const active = useMemo(() => projects.filter((p) => p.status !== 'done').sort(byDeadline), [projects]);
  const finished = useMemo(() => projects.filter((p) => p.status === 'done').sort((a, b) => b.updatedAt - a.updatedAt), [projects]);
  const soon = active.filter((p) => ['soon', 'today'].includes(urgency(p, today).kind)).length;
  const over = active.filter((p) => urgency(p, today).kind === 'over').length;

  const clients = useMemo(() => clientsOf(projects, subs), [projects, subs]);
  const debts = useMemo(() => projects.filter((p) => owed(p) > 0), [projects]);
  const debtSum = debts.reduce((n, p) => n + owed(p), 0);

  const list = active.filter((p) => (!type || p.type === type) && (!flt || (flt === 'over' ? urgency(p, today).kind === 'over' : ['soon', 'today'].includes(urgency(p, today).kind))));

  return (
    <>
      <header className="home-head">
        <div>
          <p className="greet">{t('pjSub')}</p>
          <h1>{t('pjTitle')}</h1>
        </div>
        <div className="head-btns">
          <button type="button" className="round-btn on" onClick={() => onAdd()} aria-label={t('pjAdd')}>
            +
          </button>
          <button type="button" className="round-btn" onClick={onSettings} aria-label={t('sTitle')}>
            <IconSettings width={20} height={20} />
          </button>
        </div>
      </header>

      <div className="seg" role="tablist">
        {[['projects', 'fvProjects'], ['clients', 'fvClients'], ['subs', 'fvSubs']].map(([k, label]) => (
          <button type="button" key={k} role="tab" aria-selected={view === k} className={view === k ? 'on' : ''} onClick={() => setView(k)}>{t(label)}</button>
        ))}
      </div>

      {view === 'clients' && <ClientsList clients={clients} onOpen={onOpenClient} />}
      {view === 'subs' && <SubsList subs={subs} today={today} onOpen={onOpenSub} onAdd={onAddSub} onPay={onPaySub} />}

      {view === 'projects' && (projects.length === 0 ? (
        <section className="empty-day">
          <Illustration />
          <h3>{t('pjNone')}</h3>
          <p>{t('pjNoneText')}</p>
          <div className="type-grid">
            {PTYPES.slice(0, 3).map((k) => (
              <button type="button" key={k} className={`type-btn pt-${k}`} onClick={() => onAdd(k)}>
                <span className="ptile"><TypeIcon type={k} width={24} height={24} /></span>
                <b>{t('pTypes')[k]}</b>
                <small>{t('pTypeHint')[k]}</small>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <>
          <div className="kpis three">
            <button type="button" className={`kpi${!flt ? ' sel' : ''}`} onClick={() => setFlt('')}>
              <small>{t('pjActive')}</small>
              <b>{active.length}</b>
            </button>
            <button type="button" className={`kpi warn${flt === 'soon' ? ' sel' : ''}`} onClick={() => setFlt(flt === 'soon' ? '' : 'soon')}>
              <small>{t('pjSoon')}</small>
              <b>{soon}</b>
            </button>
            <button type="button" className={`kpi bad${flt === 'over' ? ' sel' : ''}`} onClick={() => setFlt(flt === 'over' ? '' : 'over')}>
              <small>{t('pjOver')}</small>
              <b>{over}</b>
            </button>
          </div>

          {debts.length > 0 && (
            <div className="debt-card">
              <small>{t('pjDebts')}</small>
              <b>{money(debtSum)}</b>
              <span>{t('pjDebtsSub', debts.length)}</span>
            </div>
          )}

          <div className="cat-chips" role="group" aria-label={t('pfType')}>
            <button type="button" className={`cat-chip${type === '' ? ' on' : ''}`} onClick={() => setType('')}>
              {t('pjAll')}
            </button>
            {PTYPES.map((k) => (
              <button type="button" key={k} className={`cat-chip pt-${k}${type === k ? ' on' : ''}`} onClick={() => setType(type === k ? '' : k)}>
                <TypeIcon type={k} width={16} height={16} />
                {t('pTypes')[k]}
              </button>
            ))}
          </div>

          <section className="block">
            {list.length ? (
              <div className="cards">
                {list.map((p, i) => (
                  <div key={p.id} className="tl-item" style={{ '--i': i }}>
                    <ProjectCard project={p} today={today} onOpen={onOpen} onDone={onDone} onDelete={onDelete} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty small">{t('pjNoMatch')}</p>
            )}
          </section>

          {finished.length > 0 && !flt && (
            <details className="past-block">
              <summary>{t('pjDoneList')} ({finished.length})</summary>
              <div className="cards">
                {finished.filter((p) => !type || p.type === type).map((p) => (
                  <ProjectCard key={p.id} project={p} today={today} onOpen={onOpen} />
                ))}
              </div>
            </details>
          )}
        </>
      ))}
    </>
  );
}
