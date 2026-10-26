import { IconClock, IconPin } from './Icons.jsx';
import { checklistProgress, countdownText } from '../lib/meetings.js';
import { dayLabel, meetingStart } from '../lib/dates.js';
import { t } from '../lib/i18n.js';

// Ekrandagi asosiy element: eng yaqin uchrashuvgacha qancha vaqt qolgani.
export default function NextMeetingCard({ meeting, now, onOpen }) {
  const { done, total } = checklistProgress(meeting);
  return (
    <button type="button" className="hero" onClick={() => onOpen(meeting.id)}>
      <span className="hero-kicker">{t('upNext')}</span>
      <span className="hero-count">{countdownText(meetingStart(meeting), now)}</span>
      <span className="hero-name">{meeting.name}</span>
      <span className="hero-meta">
        <span>
          <IconClock width={18} height={18} />
          {dayLabel(meeting.date, now)}, {meeting.time}
        </span>
        {meeting.location && (
          <span>
            <IconPin width={18} height={18} />
            {meeting.location}
          </span>
        )}
      </span>
      {total > 0 && (
        <span className="hero-progress">
          <span className="hero-progress-text">
            {t('upPrep')}: {done}/{total}
          </span>
          <span className="bar" aria-hidden="true">
            <i style={{ width: `${(done / total) * 100}%` }} />
          </span>
        </span>
      )}
    </button>
  );
}
