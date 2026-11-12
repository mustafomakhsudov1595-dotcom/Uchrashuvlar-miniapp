import { useState } from 'react';
import { t } from '../lib/i18n.js';

const ICON = { site: '🌐', bot: '🤖', video: '🎬' };
const ago = (ts) => {
  const m = Math.max(0, Math.round((Date.now() - ts) / 60000));
  return m < 60 ? t('ldMin', m) : m < 1440 ? t('ldHour', Math.round(m / 60)) : t('ldDay', Math.round(m / 1440));
};

// Instagram lidlar roʻyxati (faqat admin uchun)
export default function LeadsView({ leads }) {
  const [open, setOpen] = useState('');
  if (!leads.length) return <section className="empty small"><h2>{t('ldNone')}</h2></section>;
  const hot = leads.filter((l) => l.hot).length, ph = leads.filter((l) => l.phone).length;
  return (
    <>
      <div className="kpis">
        <div className="kpi"><small>{t('ldAll')}</small><b>{leads.length}</b></div>
        <div className="kpi"><small>🔥 {t('ldHot')}</small><b>{hot}</b></div>
        <div className="kpi"><small>📞 {t('ldPhone')}</small><b>{ph}</b></div>
      </div>
      <div className="plist">
        {leads.map((l) => (
          <div key={l.id} className="pcard mini lead-card">
            <button type="button" className="sub-main" onClick={() => setOpen(open === l.id ? '' : l.id)}>
              <span className="ptile">{ICON[l.intent] || '💬'}</span>
              <span className="pc-main">
                <b>{l.name || (l.username ? `@${l.username}` : `ID ${l.id.slice(-5)}`)}{l.hot ? ' 🔥' : ''}{l.handoff ? ' 🙋' : ''}</b>
                <small>{l.phone || (l.username ? `@${l.username}` : '')} · {ago(l.last)}</small>
              </span>
            </button>
            {open === l.id && (
              <div className="lead-chat">
                {l.msgs.map((m, i) => <p key={i} className={`lm ${m.r}`}>{m.t}</p>)}
                {l.phone && <a className="btn btn-accent" href={`tel:${l.phone}`}>📞 {l.phone}</a>}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
