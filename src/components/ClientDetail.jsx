import Sheet from './Sheet.jsx';
import { TypeIcon, urgencyText } from './ProjectCard.jsx';
import { IconPhone } from './Icons.jsx';
import { money, owed, urgency } from '../lib/projects.js';
import { todayISO } from '../lib/dates.js';
import { t } from '../lib/i18n.js';

export default function ClientDetail({ client: c, onOpenProject, onOpenSub, onClose }) {
  const today = todayISO();
  const tel = c.contact && /\d{7,}/.test(c.contact.replace(/\D/g, '')) ? c.contact.replace(/[^\d+]/g, '') : '';
  return (
    <Sheet title={t('fvClients')} onClose={onClose}>
      <div className="d-hero cl-hero">
        <span className="avatar">{c.name.slice(0, 1).toUpperCase()}</span>
        <h3 className="d-name">{c.name}</h3>
        <p className="d-status">{t('clProjects', c.projects.length)}{c.active ? ` · ${t('clActive')}: ${c.active}` : ''}</p>
        {c.contact && (
          <p className="d-status">
            <IconPhone width={14} height={14} /> {c.contact}
            {tel && <> · <a className="map-link" href={`tel:${tel}`}>{t('dCall')}</a></>}
          </p>
        )}
      </div>

      <div className="kpis">
        <div className="kpi"><small>{t('clPrice')}</small><b className="sm">{money(c.price)}</b></div>
        <div className="kpi"><small>{t('clPaid')}</small><b className="sm ok">{money(c.paid)}</b></div>
        <div className={`kpi${c.owed ? ' bad' : ''}`}><small>{t('clOwed')}</small><b className="sm">{money(c.owed)}</b></div>
      </div>
      {c.monthly > 0 && <p className="auto-note">🔁 {t('clMonthly')}: {money(c.monthly)}</p>}

      <div className="section-title"><h4>{t('pjTitle')}</h4></div>
      <div className="cards">
        {[...c.projects].reverse().map((p) => {
          const u = urgency(p, today);
          return (
            <button type="button" key={p.id} className={`pcard pt-${p.type} mini`} onClick={() => onOpenProject(p.id)}>
              <span className="ptile"><TypeIcon type={p.type} width={20} height={20} /></span>
              <span className="pc-main">
                <b>{p.name}</b>
                <small>{urgencyText(u)}{owed(p) > 0 ? ` · ${t('clOwed')}: ${money(owed(p))}` : ''}</small>
              </span>
            </button>
          );
        })}
      </div>

      {c.subs.length > 0 && (
        <>
          <div className="section-title"><h4>{t('fvSubs')}</h4></div>
          <div className="cards">
            {c.subs.map((x) => (
              <button type="button" key={x.id} className="pcard mini" onClick={() => onOpenSub(x.id)}>
                <span className="ptile sub">🔁</span>
                <span className="pc-main"><b>{x.name}</b><small>{money(x.amount)} · {t('subDay', x.day)}</small></span>
              </button>
            ))}
          </div>
        </>
      )}
    </Sheet>
  );
}
