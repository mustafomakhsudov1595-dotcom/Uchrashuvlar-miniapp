import Sheet from './Sheet.jsx';
import { IconClose, IconSend, IconStar } from './Icons.jsx';
import { LANGS, getLang, t } from '../lib/i18n.js';
import { openTelegramLink } from '../lib/telegram.js';

const BOT = 'Improitnotes_bot';

export default function SettingsSheet({ places, onLang, onRemovePlace, onClose }) {
  const cur = getLang();
  return (
    <Sheet title={t('sTitle')} onClose={onClose}>
      <div className="section-title">
        <h4>{t('sLang')}</h4>
      </div>
      <div className="seg" role="radiogroup" aria-label={t('sLang')}>
        {LANGS.map(([code, label]) => (
          <button type="button" key={code} role="radio" aria-checked={cur === code} className={`seg-btn${cur === code ? ' on' : ''}`} onClick={() => onLang(code)}>
            {label}
          </button>
        ))}
      </div>

      <div className="section-title">
        <h4>{t('sPlaces')}</h4>
      </div>
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

      <div className="section-title">
        <h4>{t('sBot')}</h4>
      </div>
      <p className="notes">{t('sBotText')}</p>
      <button type="button" className="btn btn-accent bot-btn" onClick={() => openTelegramLink(`https://t.me/${BOT}`)}>
        <IconSend width={18} height={18} />
        {t('sBotOpen')}
      </button>
    </Sheet>
  );
}
