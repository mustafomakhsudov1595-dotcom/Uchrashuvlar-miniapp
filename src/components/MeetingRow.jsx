import { IconCheck } from './Icons.jsx';
import { checklistProgress } from '../lib/meetings.js';

function Row({ meeting, onOpen, muted }) {
  const { done, total } = checklistProgress(meeting);
  return (
    <button type="button" className={`row${muted ? ' past' : ''}`} onClick={() => onOpen(meeting.id)}>
      <span className="row-time">{meeting.time}</span>
      <span className="row-main">
        <span className="row-name">{meeting.name}</span>
        {meeting.location && <span className="row-sub">{meeting.location}</span>}
      </span>
      {total > 0 && (
        <span className={`chip${done === total ? ' done' : ''}`}>
          <IconCheck width={14} height={14} strokeWidth={2.4} />
          {done}/{total}
        </span>
      )}
    </button>
  );
}

// Bir kundagi uchrashuvlar ro'yxati: bitta oq yuza, ichida chiziqlar bilan ajratilgan qatorlar.
export default function MeetingList({ items, onOpen, muted = false }) {
  return (
    <ul className="list">
      {items.map((m) => (
        <li key={m.id}>
          <Row meeting={m} onOpen={onOpen} muted={muted} />
        </li>
      ))}
    </ul>
  );
}
