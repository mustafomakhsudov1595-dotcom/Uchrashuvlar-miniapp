import { useMemo, useState } from 'react';
import Illustration from './Illustration.jsx';
import { fullUrl, matchService, serviceDays, svKind } from '../lib/services.js';
import { openExternal } from '../lib/telegram.js';
import { t } from '../lib/i18n.js';

const hostOf = (u) => u.replace(/^https?:\/\//i, '').replace(/\/$/, '');

export function ServiceList({ services, today, onOpen, onAdd }) {
  const [q, setQ] = useState('');
  const [flt, setFlt] = useState('');
  const list = useMemo(
    () => services.filter((x) => matchService(x, q) && (!flt || svKind(serviceDays(x, today)) === flt)).sort((a, b) => serviceDays(a, today) - serviceDays(b, today)),
    [services, q, flt, today],
  );
  const cnt = (k) => services.filter((x) => svKind(serviceDays(x, today)) === k).length;
  return (
    <>
      <div className="search-box">
        <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('svSearch')} enterKeyHint="search" />
      </div>
      {services.length > 0 && (
        <div className="cat-chips" role="group">
          <button type="button" className={`cat-chip${flt === '' ? ' on' : ''}`} onClick={() => setFlt('')}>{t('pjAll')} · {services.length}</button>
          <button type="button" className={`cat-chip${flt === 'ok' ? ' on' : ''}`} onClick={() => setFlt(flt === 'ok' ? '' : 'ok')}>🟢 {t('svActive')} · {cnt('ok')}</button>
          <button type="button" className={`cat-chip${flt === 'soon' ? ' on' : ''}`} onClick={() => setFlt(flt === 'soon' ? '' : 'soon')}>🟠 {t('svSoon')} · {cnt('soon')}</button>
          <button type="button" className={`cat-chip${flt === 'over' ? ' on' : ''}`} onClick={() => setFlt(flt === 'over' ? '' : 'over')}>🔴 {t('svOver')} · {cnt('over')}</button>
        </div>
      )}
      {services.length === 0 ? (
        <section className="empty-day">
          <Illustration />
          <h3>{t('svNone')}</h3>
          <p>{t('svNoneText')}</p>
        </section>
      ) : list.length === 0 ? (
        <p className="empty small">{t('pjNoMatch')}</p>
      ) : (
        <div className="cards">
          {list.map((x, i) => {
            const d = serviceDays(x, today);
            return (
              <div key={x.id} className="tl-item" style={{ '--i': i }}>
                <div className={`pcard mini sv-row k-${svKind(d)}`}>
                  <button type="button" className="sub-main" onClick={() => onOpen(x.id)}>
                    <span className="ptile sv">🛠</span>
                    <span className="pc-main">
                      <b>{x.name}</b>
                      <small>{[x.client, x.url && hostOf(x.url)].filter(Boolean).join(' · ') || '—'}</small>
                      <small className={`sv-left k-${svKind(d)}`}>{t('svLeft', d)}</small>
                      {!x.claudeUrl && <small className="sv-warn">🤖❗ {t('svNoClaudeTag')}</small>}
                    </span>
                  </button>
                  {x.claudeUrl && (
                    <button type="button" className="btn btn-accent add-btn sv-claude" onClick={() => openExternal(fullUrl(x.claudeUrl))} aria-label="Claude">🤖</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <button type="button" className="btn btn-primary wide-add" onClick={onAdd}>+ {t('svAdd')}</button>
    </>
  );
}
