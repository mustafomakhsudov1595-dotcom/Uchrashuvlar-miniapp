import SwipeRow from './SwipeRow.jsx';
import { IconCheck, IconPhone, IconPin, IconTrash } from './Icons.jsx';
import { checklistProgress } from '../lib/meetings.js';
import { t } from '../lib/i18n.js';

export default function MeetingCard({ meeting: m, onOpen, onDone, onDelete, showDate = '', muted = false }) {
  const { done, total } = checklistProgress(m);
  const cancelled = m.status === 'cancelled';
  const body = (
    <button type="button" className={`mcard${muted ? ' muted' : ''}${cancelled ? ' cancelled' : ''}${m.cat ? ` cat-${m.cat}` : ''}`} onClick={() => onOpen(m.id)}>
      <span className="mcard-bar" />
      <span className="mcard-time">
        <b>{m.time}</b>
        {showDate && <small>{showDate}</small>}
      </span>
      <span className="mcard-main">
        <span className="mcard-name">{m.name}</span>
        <span className="mcard-meta">
          {m.location && (
            <span>
              <IconPin width={14} height={14} />
              {m.location}
            </span>
          )}
          {m.phone && (
            <span>
              <IconPhone width={14} height={14} />
              {m.phone}
            </span>
          )}
        </span>
      </span>
      {m.status === 'done' && <span className="pill ok">{t('dStatusDone')}</span>}
      {cancelled && <span className="pill">{t('dStatusCancelled')}</span>}
      {!m.status && total > 0 && (
        <span className={`pill${done === total ? ' ok' : ''}`}>
          <IconCheck width={13} height={13} strokeWidth={2.6} />
          {done}/{total}
        </span>
      )}
    </button>
  );
  if (!onDone && !onDelete) return body;
  return (
    <SwipeRow
      onRight={m.status ? undefined : () => onDone(m.id)}
      onLeft={() => onDelete(m.id)}
      rightLabel={t('swDone')}
      leftLabel={t('swDelete')}
      rightIcon={<IconCheck width={20} height={20} strokeWidth={2.6} />}
      leftIcon={<IconTrash width={20} height={20} />}
    >
      {body}
    </SwipeRow>
  );
}
