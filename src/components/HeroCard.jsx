import { IconClock, IconPin, IconSparkle } from './Icons.jsx';
import { checklistProgress, countdownText } from '../lib/meetings.js';
import { dayLabel, meetingStart } from '../lib/dates.js';
import { t } from '../lib/i18n.js';

const R = 46;
const C = 2 * Math.PI * R;

// Eng yaqin uchrashuv: jonli halqa (24 soat ichida to'ladi) va katta hisoblagich.
export default function HeroCard({ meeting, now, onOpen, onAdd }) {
  if (!meeting) {
    return (
      <section className="hero hero-empty">
        <span className="hero-spark">
          <IconSparkle width={26} height={26} />
        </span>
        <h2>{t('heroEmptyTitle')}</h2>
        <p>{t('heroEmptyText')}</p>
        <button type="button" className="btn btn-glass" onClick={() => onAdd()}>
          {t('upAdd')}
        </button>
      </section>
    );
  }
  const start = meetingStart(meeting);
  const ms = Math.max(0, start - now);
  const min = Math.ceil(ms / 60000);
  const progress = Math.min(1, Math.max(0, 1 - ms / 86400000));
  let big;
  let unit;
  if (min <= 0) { big = '•'; unit = t('nowLabel'); }
  else if (min < 60) { big = String(min); unit = t('uMin'); }
  else if (min < 1440) { big = `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`; unit = t('uH'); }
  else { big = String(Math.round(ms / 86400000)); unit = t('uD'); }
  const { done, total } = checklistProgress(meeting);

  return (
    <button type="button" className={`hero${meeting.cat ? ` cat-${meeting.cat}` : ''}`} onClick={() => onOpen(meeting.id)}>
      <span className="hero-kicker">
        <i className="live-dot" />
        {t('upNext')}
        {meeting.cat && <em>{t('cats')[meeting.cat]}</em>}
      </span>
      <span className="hero-body">
        <span className="hero-text">
          <span className="hero-name">{meeting.name}</span>
          <span className="hero-cd">{countdownText(start, now)}</span>
          <span className="hero-chips">
            <span>
              <IconClock width={15} height={15} />
              {dayLabel(meeting.date, now)}, {meeting.time}
            </span>
            {meeting.location && (
              <span>
                <IconPin width={15} height={15} />
                {meeting.location}
              </span>
            )}
          </span>
        </span>
        <span className="ring" aria-hidden="true">
          <svg viewBox="0 0 110 110">
            <circle cx="55" cy="55" r={R} className="ring-bg" />
            <circle cx="55" cy="55" r={R} className="ring-fg" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} />
          </svg>
          <span className="ring-center">
            <b>{big}</b>
            <small>{unit}</small>
          </span>
        </span>
      </span>
      {total > 0 && (
        <span className="hero-prep">
          <span>
            {t('upPrep')}: {done}/{total}
          </span>
          <span className="bar">
            <i style={{ width: `${(done / total) * 100}%` }} />
          </span>
        </span>
      )}
    </button>
  );
}
