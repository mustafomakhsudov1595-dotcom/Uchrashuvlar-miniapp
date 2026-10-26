import { useState } from 'react';
import Sheet from './Sheet.jsx';
import { IconCalendar, IconClose, IconLink, IconSend, IconStar } from './Icons.jsx';
import { LANGS, getLang, t } from '../lib/i18n.js';
import { ACCENTS, MODES, setAccent, setMode, useTheme } from '../lib/theme.js';
import { openExternal, openTelegramLink } from '../lib/telegram.js';

const BOT = 'Improitnotes_bot';
const MODE_KEY = { auto: 'modeAuto', light: 'modeLight', dark: 'modeDark' };

export default function SettingsSheet({ places, onLang, onRemovePlace, onCalendarLink, onClose }) {
  const cur = getLang();
  const theme = useTheme();
  const [cal, setCal] = useState(null);
  const [busy, setBusy] = useState(false);

  const getLink = async () => {
    setBusy(true);
    try {
      setCal(await onCalendarLink());
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title={t('sTitle')} onClose={onClose}>
      <div className="section-title"><h4>{t('sLang')}</h4></div>
      <div className="seg" role="radiogroup" aria-label={t('sLang')}>
        {LANGS.map(([code, label]) => (
          <button type="button" key={code} role="radio" aria-checked={cur === code} className={`seg-btn${cur === code ? ' on' : ''}`} onClick={() => onLang(code)}>
            {label}
          </button>
        ))}
      </div>

      <div className="section-title"><h4>{t('sTheme')}</h4></div>
      <div className="seg" role="radiogroup" aria-label={t('sMode')}>
        {MODES.map((m) => (
          <button type="button" key={m} role="radio" aria-checked={theme.mode === m} className={`seg-btn${theme.mode === m ? ' on' : ''}`} onClick={() => setMode(m)}>
            {t(MODE_KEY[m])}
          </button>
        ))}
      </div>
      <div className="swatches" role="radiogroup" aria-label={t('sAccent')}>
        {ACCENTS.map((a) => (
          <button type="button" key={a} role="radio" aria-checked={theme.accent === a} aria-label={t('accent')[a]} className={`swatch sw-${a}${theme.accent === a ? ' on' : ''}`} onClick={() => setAccent(a)}>
            <i />
            <span>{t('accent')[a]}</span>
          </button>
        ))}
      </div>

      <div className="section-title"><h4>{t('sCalendar')}</h4></div>
      <p className="notes">{t('sCalendarText')}</p>
      {!cal ? (
        <button type="button" className="btn btn-accent bot-btn" onClick={getLink} disabled={busy}>
          <IconCalendar width={18} height={18} />
          {t('sCalGet')}
        </button>
      ) : (
        <div className="cal-menu">
          <button type="button" className="btn btn-accent" onClick={() => openExternal(cal.webcal)}>
            <IconCalendar width={18} height={18} />
            {t('sCalOpen')}
          </button>
          <button
            type="button"
            className="btn btn-glass"
            onClick={async () => {
              try { await navigator.clipboard?.writeText(cal.https); } catch { /* ignore */ }
              onCalendarLink('copied');
            }}
          >
            <IconLink width={18} height={18} />
            {t('sCalCopy')}
          </button>
        </div>
      )}

      <div className="section-title"><h4>{t('sPlaces')}</h4></div>
      {places.length ? (
        <ul className="list">
          {places.map((p) => (
            <li key={p} className="place-row">
              <IconStar width={18} height={18} className="star-ico" />
              <span>{p}</span>
              <button type="button" className="icon-btn" onClick={() => onRemovePlace(p)} aria-label={`${p} — ${t('sRemove')}`}>
                <IconClose width={18} height={18} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="notes">{t('sNoPlaces')}</p>
      )}

      <div className="section-title"><h4>{t('sBot')}</h4></div>
      <p className="notes">{t('sBotText')}</p>
      <button type="button" className="btn btn-glass bot-btn" onClick={() => openTelegramLink(`https://t.me/${BOT}`)}>
        <IconSend width={18} height={18} />
        {t('sBotOpen')}
      </button>
    </Sheet>
  );
}
