import Sheet from './Sheet.jsx';
import { IconCalendar, IconCheck, IconClock, IconEdit, IconExternal, IconPin, IconTrash } from './Icons.jsx';
import { checklistProgress, statusText } from '../lib/meetings.js';
import { formatFull } from '../lib/dates.js';
import { openExternal } from '../lib/telegram.js';

export default function MeetingDetail({ meeting, now, onToggle, onEdit, onDelete, onClose }) {
  const { done, total } = checklistProgress(meeting);
  const mapUrl = `https://yandex.uz/maps/?text=${encodeURIComponent(meeting.location)}`;

  return (
    <Sheet
      title="Uchrashuv"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-danger" onClick={onDelete}>
            <IconTrash width={20} height={20} />
            Oʻchirish
          </button>
          <button type="button" className="btn btn-primary" onClick={onEdit}>
            <IconEdit width={20} height={20} />
            Tahrirlash
          </button>
        </>
      }
    >
      <h3 className="d-name">{meeting.name}</h3>
      <p className="d-status">{statusText(meeting, now)}</p>

      <div className="info">
        <div className="info-row">
          <IconCalendar />
          <div>
            <div className="info-label">Sana</div>
            <div className="info-value">{formatFull(meeting.date)}</div>
          </div>
        </div>
        <div className="info-row">
          <IconClock />
          <div>
            <div className="info-label">Vaqt</div>
            <div className="info-value">{meeting.time}</div>
          </div>
        </div>
        {meeting.location && (
          <div className="info-row">
            <IconPin />
            <div>
              <div className="info-label">Joy</div>
              <div className="info-value">{meeting.location}</div>
              <a
                className="map-link"
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  openExternal(mapUrl);
                }}
              >
                Xaritada ochish
                <IconExternal width={16} height={16} />
              </a>
            </div>
          </div>
        )}
      </div>

      {total > 0 && (
        <>
          <div className="section-title">
            <h4>Olib borish yoki berish kerak</h4>
            <span className="count">
              {done}/{total}
            </span>
          </div>
          <ul className="list">
            {meeting.checklist.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={item.done}
                  className="todo"
                  onClick={() => onToggle(item.id)}
                >
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
            <h4>Izoh</h4>
          </div>
          <p className="notes">{meeting.notes}</p>
        </>
      )}
    </Sheet>
  );
}
