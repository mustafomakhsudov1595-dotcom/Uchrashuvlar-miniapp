import Sheet from './Sheet.jsx';
import { IconCalendar, IconCheck, IconClock, IconClose, IconEdit, IconExternal, IconPhone, IconPin, IconSend, IconTrash, IconUsers } from './Icons.jsx';
import { checklistProgress, statusText } from '../lib/meetings.js';
import { formatFull } from '../lib/dates.js';
import { openExternal } from '../lib/telegram.js';
import { t } from '../lib/i18n.js';

function mapLinks(m) {
  if (m.lat !== null && m.lon !== null) {
    return {
      google: `https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lon}`,
      yandex: `https://yandex.com/maps/?pt=${m.lon},${m.lat}&z=16&l=map`,
    };
  }
  if (!m.location) return null;
  const q = encodeURIComponent(m.location);
  return { google: `https://www.google.com/maps/search/?api=1&query=${q}`, yandex: `https://yandex.com/maps/?text=${q}` };
}

function ExtLink({ href, children }) {
  return (
    <a
      className="map-link"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        e.preventDefault();
        openExternal(href);
      }}
    >
      {children}
      <IconExternal width={16} height={16} />
    </a>
  );
}

export default function MeetingDetail({ meeting, now, onToggle, onEdit, onDelete, onClose, onStatus, onInvite, inviting }) {
  const { done, total } = checklistProgress(meeting);
  const map = mapLinks(meeting);

  return (
    <Sheet
      title={t('dTitle')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-danger" onClick={onDelete}>
            <IconTrash width={20} height={20} />
            {t('dDelete')}
          </button>
          <button type="button" className="btn btn-primary" onClick={onEdit}>
            <IconEdit width={20} height={20} />
            {t('dEdit')}
          </button>
        </>
      }
    >
      <h3 className="d-name">
        {meeting.cat && <i className={`cat-dot cat-${meeting.cat}`} aria-label={t('cats')[meeting.cat]} />}
        {meeting.name}
      </h3>
      <p className="d-status">
        {statusText(meeting, now)}
        {meeting.cat && <span className="d-cat"> · {t('cats')[meeting.cat]}</span>}
      </p>

      <div className="actions">
        {meeting.status ? (
          <button type="button" className="act" onClick={() => onStatus('')}>
            {t('dReopen')}
          </button>
        ) : (
          <>
            <button type="button" className="act ok" onClick={() => onStatus('done')}>
              <IconCheck width={18} height={18} strokeWidth={2.4} />
              {t('dDone')}
            </button>
            <button type="button" className="act bad" onClick={() => onStatus('cancelled')}>
              <IconClose width={18} height={18} />
              {t('dCancelled')}
            </button>
          </>
        )}
        <button type="button" className="act" onClick={onInvite} disabled={inviting}>
          <IconSend width={18} height={18} />
          {t('dInvite')}
        </button>
      </div>

      <div className="info">
        <div className="info-row">
          <IconCalendar />
          <div>
            <div className="info-label">{t('dDate')}</div>
            <div className="info-value">{formatFull(meeting.date)}</div>
          </div>
        </div>
        <div className="info-row">
          <IconClock />
          <div>
            <div className="info-label">{t('dTime')}</div>
            <div className="info-value">{meeting.time}</div>
          </div>
        </div>
        {meeting.location && (
          <div className="info-row">
            <IconPin />
            <div>
              <div className="info-label">{t('dPlace')}</div>
              <div className="info-value">{meeting.location}</div>
              {map && (
                <div className="map-links">
                  <ExtLink href={map.google}>{t('dGoogle')}</ExtLink>
                  <ExtLink href={map.yandex}>{t('dYandex')}</ExtLink>
                </div>
              )}
            </div>
          </div>
        )}
        {meeting.phone && (
          <div className="info-row">
            <IconPhone />
            <div>
              <div className="info-label">{t('dPhone')}</div>
              <div className="info-value">{meeting.phone}</div>
              <a className="map-link" href={`tel:${meeting.phone.replace(/[^\d+]/g, '')}`}>
                {t('dCall')}
              </a>
            </div>
          </div>
        )}
        {(meeting.from || meeting.guests > 0) && (
          <div className="info-row">
            <IconUsers />
            <div>
              <div className="info-value">{meeting.from ? t('dFrom', meeting.from) : t('dGuests', meeting.guests)}</div>
            </div>
          </div>
        )}
      </div>

      {total > 0 && (
        <>
          <div className="section-title">
            <h4>{t('dChecklist')}</h4>
            <span className="count">
              {done}/{total}
            </span>
          </div>
          <ul className="list">
            {meeting.checklist.map((item) => (
              <li key={item.id}>
                <button type="button" role="checkbox" aria-checked={item.done} className="todo" onClick={() => onToggle(item.id)}>
                  <span className="box">{item.done && <IconCheck width={16} height={16} strokeWidth={3} />}</span>
                  <span className="todo-text">{item.text}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {meeting.notes && (
        <>
          <div className="section-title">
            <h4>{t('dNotes')}</h4>
          </div>
          <p className="notes">{meeting.notes}</p>
        </>
      )}
    </Sheet>
  );
}
