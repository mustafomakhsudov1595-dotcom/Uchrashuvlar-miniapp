import { useMemo } from 'react';
import NextMeetingCard from './NextMeetingCard.jsx';
import MeetingList from './MeetingRow.jsx';
import { IconChevronRight } from './Icons.jsx';
import { groupByDate, splitMeetings } from '../lib/meetings.js';
import { dayLabel, formatWithWeekday, toISODate } from '../lib/dates.js';

export default function UpcomingView({ meetings, now, onOpen, onAdd }) {
  const { upcoming, past } = useMemo(() => splitMeetings(meetings, now), [meetings, now]);
  const [next, ...rest] = upcoming;
  const groups = groupByDate(rest);

  return (
    <>
      <header className="top">
        <h1>Uchrashuvlar</h1>
        <p>{formatWithWeekday(toISODate(now))}</p>
      </header>

      {next ? (
        <NextMeetingCard meeting={next} now={now} onOpen={onOpen} />
      ) : (
        <section className="empty">
          <h2>{meetings.length ? 'Yaqin uchrashuv yoʻq' : 'Hali uchrashuv yoʻq'}</h2>
          <p>Kim bilan, qachon va nimalarni olib borishni yozib qoʻying. Hammasi bir joyda turadi.</p>
          <button type="button" className="btn btn-primary" onClick={() => onAdd()}>
            Uchrashuv qoʻshish
          </button>
        </section>
      )}

      {groups.map((g) => (
        <section className="group" key={g.iso}>
          <h2 className="group-title">{dayLabel(g.iso, now)}</h2>
          <MeetingList items={g.items} onOpen={onOpen} />
        </section>
      ))}

      {past.length > 0 && (
        <details className="past-block">
          <summary>
            <IconChevronRight width={18} height={18} />
            Oʻtgan uchrashuvlar ({past.length})
          </summary>
          <MeetingList items={past} onOpen={onOpen} muted />
        </details>
      )}
    </>
  );
}
