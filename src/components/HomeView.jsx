import { useMemo, useState } from 'react';
import HeroCard from './HeroCard.jsx';
import WeekStrip from './WeekStrip.jsx';
import QuickAdd from './QuickAdd.jsx';
import MeetingCard from './MeetingCard.jsx';
import Illustration from './Illustration.jsx';
import { TypeIcon, urgencyText } from './ProjectCard.jsx';
import { byDeadline, urgency } from '../lib/projects.js';
import { IconChevronRight, IconClose, IconSearch, IconSettings } from './Icons.jsx';
import { byStart, CATS, splitMeetings } from '../lib/meetings.js';
import { dayLabel, formatWithWeekday, meetingStart, toISODate } from '../lib/dates.js';
import { t } from '../lib/i18n.js';

const greeting = (h) => (h < 5 ? t('greetNight') : h < 12 ? t('greetMorning') : h < 18 ? t('greetDay') : t('greetEvening'));
const userName = () => window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name || '';

export default function HomeView({ projects = [], onOpenProject, onOpenProjects, meetings, now, selected, onSelect, onOpen, onAdd, onDone, onDelete, onSettings, onQuickCreate, onQuickForm }) {
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const query = q.trim().toLowerCase();
  const filtering = searching && Boolean(query || cat);

  const { upcoming, past } = useMemo(() => splitMeetings(meetings, now), [meetings, now]);
  const today = toISODate(now);
  const deadlines = useMemo(() => projects.filter((p) => p.status !== 'done').sort(byDeadline).slice(0, 6), [projects]);
  const dayItems = useMemo(() => meetings.filter((m) => m.date === selected).sort(byStart), [meetings, selected]);
  const nextList = upcoming.filter((m) => m.date !== selected).slice(0, 6);
  const results = useMemo(
    () =>
      filtering
        ? meetings
            .filter((m) => (!cat || m.cat === cat) && (!query || [m.name, m.location, m.phone, m.notes].some((f) => (f || '').toLowerCase().includes(query))))
            .sort(byStart)
        : [],
    [meetings, filtering, cat, query],
  );

  // Bugun uchun "hozir" chizig'i: birinchi hali boshlanmagan uchrashuv oldiga qo'yiladi.
  let nowIdx = -1;
  if (selected === today) {
    nowIdx = dayItems.findIndex((m) => meetingStart(m) > now);
    if (nowIdx === -1) nowIdx = dayItems.length;
  }
  const nowLine = (
    <div className="nowline" key="now">
      <i />
      <span>
        {t('nowLabel')} · {String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}
      </span>
    </div>
  );

  const name = userName();
  return (
    <>
      <header className="home-head">
        <div>
          <p className="greet">
            {greeting(now.getHours())}
            {name ? `, ${name}` : ''}
          </p>
          <h1>{formatWithWeekday(today)}</h1>
        </div>
        <div className="head-btns">
          <button type="button" className={`round-btn${searching ? ' on' : ''}`} onClick={() => { setSearching((s) => !s); setQ(''); setCat(''); }} aria-label={t('searchOpen')}>
            {searching ? <IconClose width={20} height={20} /> : <IconSearch width={20} height={20} />}
          </button>
          <button type="button" className="round-btn" onClick={onSettings} aria-label={t('sTitle')}>
            <IconSettings width={20} height={20} />
          </button>
        </div>
      </header>

      {searching && (
        <div className="filters">
          <div className="search">
            <IconSearch width={18} height={18} />
            <input className="input" type="search" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')} enterKeyHint="search" autoComplete="off" />
          </div>
          <div className="cat-chips" role="group" aria-label={t('fCat')}>
            <button type="button" className={`cat-chip${cat === '' ? ' on' : ''}`} onClick={() => setCat('')}>
              {t('all')}
            </button>
            {CATS.map((c) => (
              <button type="button" key={c} className={`cat-chip cat-${c}${cat === c ? ' on' : ''}`} onClick={() => setCat(cat === c ? '' : c)}>
                <i className="cat-dot" />
                {t('cats')[c]}
              </button>
            ))}
          </div>
        </div>
      )}

      {filtering ? (
        results.length ? (
          <section className="block">
            <div className="cards">
              {results.map((m) => (
                <MeetingCard key={m.id} meeting={m} onOpen={onOpen} showDate={dayLabel(m.date, now)} muted={meetingStart(m) < now} />
              ))}
            </div>
          </section>
        ) : (
          <section className="empty small">
            <h2>{t('noResults')}</h2>
          </section>
        )
      ) : (
        !searching && (
          <>
            <QuickAdd now={now} onCreate={onQuickCreate} onOpenForm={onQuickForm} />
            <HeroCard meeting={upcoming[0]} now={now} onOpen={onOpen} onAdd={onAdd} />
            {deadlines.length > 0 && (
              <section className="block rail-block">
                <div className="block-head">
                  <h2>{t('secDeadlines')}</h2>
                  <button type="button" className="link-more" onClick={onOpenProjects}>{t('pjOpenProj')} →</button>
                </div>
                <div className="rail">
                  {deadlines.map((p) => {
                    const u = urgency(p, today);
                    return (
                      <button type="button" key={p.id} className={`rcard pt-${p.type}`} onClick={() => onOpenProject(p.id)}>
                        <span className="ptile"><TypeIcon type={p.type} width={20} height={20} /></span>
                        <b>{p.name}</b>
                        <small>{p.client || t('pTypes')[p.type]}</small>
                        <span className={`urg ${u.kind}`}>{urgencyText(u)}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
            <WeekStrip selected={selected} onSelect={onSelect} meetings={meetings} now={now} />

            <section className="block">
              <div className="block-head">
                <h2>{dayLabel(selected, now)}</h2>
                <span className="count-pill">{dayItems.length}</span>
              </div>
              {dayItems.length ? (
                <div className="timeline">
                  {dayItems.map((m, i) => (
                    <div key={m.id} className="tl-item" style={{ '--i': i }}>
                      {nowIdx === i && nowLine}
                      <MeetingCard meeting={m} onOpen={onOpen} onDone={onDone} onDelete={onDelete} muted={meetingStart(m) < now && !m.status} />
                    </div>
                  ))}
                  {nowIdx === dayItems.length && nowLine}
                </div>
              ) : (
                <div className="empty-day">
                  <Illustration />
                  <h3>{t('dayEmptyTitle')}</h3>
                  <p>{t('dayEmptyText')}</p>
                  <button type="button" className="btn btn-accent" onClick={() => onAdd(selected)}>
                    {t('calAddDay')}
                  </button>
                </div>
              )}
            </section>

            {nextList.length > 0 && (
              <section className="block">
                <div className="block-head">
                  <h2>{t('secNext')}</h2>
                </div>
                <div className="cards">
                  {nextList.map((m) => (
                    <MeetingCard key={m.id} meeting={m} onOpen={onOpen} onDone={onDone} onDelete={onDelete} showDate={dayLabel(m.date, now)} />
                  ))}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <details className="past-block">
                <summary>
                  <IconChevronRight width={18} height={18} />
                  {t('upPast')} ({past.length})
                </summary>
                <div className="cards">
                  {past.slice(0, 30).map((m) => (
                    <MeetingCard key={m.id} meeting={m} onOpen={onOpen} showDate={dayLabel(m.date, now)} muted />
                  ))}
                </div>
              </details>
            )}
          </>
        )
      )}
    </>
  );
}
