import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HomeView from './components/HomeView.jsx';
import CalendarView from './components/CalendarView.jsx';
import StatsView from './components/StatsView.jsx';
import ProjectsView from './components/ProjectsView.jsx';
import ProjectDetail from './components/ProjectDetail.jsx';
import ProjectForm from './components/ProjectForm.jsx';
import MeetingDetail from './components/MeetingDetail.jsx';
import MeetingForm from './components/MeetingForm.jsx';
import SettingsSheet from './components/SettingsSheet.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import TabBar from './components/TabBar.jsx';
import Toast from './components/Toast.jsx';
import Confetti from './components/Confetti.jsx';
import {
  loadMeetings, saveMeetings, loadDeleted, saveDeleted, loadPlaces, savePlaces, syncRemote, createInvite, getCalendarToken, signature,
  loadProjects, saveProjects, loadPDeleted, savePDeleted, projSignature,
} from './lib/storage.js';
import { planTasks, shiftDate } from './lib/projects.js';
import { newId } from './lib/meetings.js';
import { addDays, fromISODate, meetingStart, toISODate, todayISO } from './lib/dates.js';
import { haptic, isTelegram, openExternal, openTelegramLink } from './lib/telegram.js';
import { useBackButton, useNow } from './lib/hooks.js';
import { getLang, hasSavedLang, setLang, t, useLang } from './lib/i18n.js';

const blank = { status: '', from: '', src: '', guests: 0, lat: null, lon: null, location: '', phone: '', cat: '', notes: '', checklist: [] };

// Google Calendar "qo'shish" havolasi (qurilma vaqt zonasida)
function googleCalUrl(m) {
  const s = meetingStart(m);
  const e = new Date(s.getTime() + 3600000);
  const f = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const details = [m.notes, m.phone && `📞 ${m.phone}`, ...m.checklist.map((i) => `• ${i.text}`)].filter(Boolean).join('\n');
  const q = new URLSearchParams({ action: 'TEMPLATE', text: m.name, dates: `${f(s)}/${f(e)}`, details, location: m.location || '' });
  return `https://calendar.google.com/calendar/render?${q}`;
}

export default function App() {
  const lang = useLang(); // til o'zgarsa butun ilova qayta chiziladi
  const [meetings, setMeetings] = useState(loadMeetings);
  const [places, setPlaces] = useState(() => loadPlaces());
  const [projects, setProjects] = useState(loadProjects);
  const [confirmPid, setConfirmPid] = useState(null);
  const [tab, setTab] = useState('home');
  const [selectedDate, setSelectedDate] = useState(todayISO);
  // sheet: null | { type: 'detail', id } | { type: 'form', id?, date?, prefill?, titleKey? } | { type: 'settings' }
  const [sheet, setSheet] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [toast, setToast] = useState(null);
  const [burst, setBurst] = useState(0);
  const toastTimer = useRef(null);
  const calToken = useRef(null);
  const now = useNow(15000);

  const meetingsRef = useRef(meetings);
  meetingsRef.current = meetings;
  const placesRef = useRef(places);
  placesRef.current = places;
  const projectsRef = useRef(projects);
  projectsRef.current = projects;
  const pdeletedRef = useRef(loadPDeleted());
  const pFromServer = useRef(false);
  const deletedRef = useRef(loadDeleted());
  const fromServer = useRef(false);
  const syncing = useRef(false);
  const syncTimer = useRef(null);
  const langRef = useRef(lang);
  langRef.current = lang;

  // Serverga yuboradi va birlashtirilgan natijani qaytarib oladi.
  const doSync = useCallback(async () => {
    if (!isTelegram || syncing.current) return;
    syncing.current = true;
    try {
      const sentDeleted = [...deletedRef.current];
      const sentPDeleted = [...pdeletedRef.current];
      const remote = await syncRemote({
        meetings: meetingsRef.current,
        deleted: sentDeleted,
        lang: hasSavedLang() ? langRef.current : undefined,
        places: placesRef.current.list,
        placesAt: placesRef.current.at,
        projects: projectsRef.current,
        pdeleted: [...pdeletedRef.current],
      });
      if (remote) {
        deletedRef.current = deletedRef.current.filter((id) => !sentDeleted.includes(id));
        saveDeleted(deletedRef.current);
        pdeletedRef.current = pdeletedRef.current.filter((id) => !sentPDeleted.includes(id));
        savePDeleted(pdeletedRef.current);
        if (projSignature(remote.projects) !== projSignature(projectsRef.current)) {
          pFromServer.current = true;
          setProjects(remote.projects);
        }
        if (remote.lang && !hasSavedLang()) setLang(remote.lang, false); // botda tanlangan til
        if (remote.placesAt > placesRef.current.at) {
          const next = { list: remote.places, at: remote.placesAt };
          savePlaces(next.list, next.at);
          setPlaces(next);
        }
        if (signature(remote.meetings) !== signature(meetingsRef.current)) {
          fromServer.current = true;
          setMeetings(remote.meetings);
        }
      }
    } catch {
      /* tarmoq yo'q — keyingi safar urinamiz */
    } finally {
      syncing.current = false;
    }
  }, []);

  const scheduleSync = useCallback(() => {
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(doSync, 600);
  }, [doSync]);

  useEffect(() => {
    saveMeetings(meetings);
    if (fromServer.current) {
      fromServer.current = false;
      return;
    }
    scheduleSync();
  }, [meetings, scheduleSync]);

  useEffect(() => {
    saveProjects(projects);
    if (pFromServer.current) {
      pFromServer.current = false;
      return;
    }
    scheduleSync();
  }, [projects, scheduleSync]);

  useEffect(() => {
    doSync();
    const id = setInterval(doSync, 30000);
    const onVisible = () => document.visibilityState === 'visible' && doSync();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [doSync]);

  // Bot tugmalaridan kelgan havola: ?edit=<id> yoki ?new=1
  const deepLink = useRef(new URLSearchParams(window.location.search));
  useEffect(() => {
    const p = deepLink.current;
    if (!p) return;
    const projId = p.get('proj');
    if (p.get('tab') === 'projects') setTab('projects');
    if (projId && projects.some((x) => x.id === projId)) {
      setTab('projects');
      setSheet({ type: 'pdetail', id: projId });
      deepLink.current = null;
      return;
    }
    const editId = p.get('edit');
    if (editId && meetings.some((m) => m.id === editId)) {
      setSheet({ type: 'form', id: editId });
      deepLink.current = null;
    } else if (p.get('new')) {
      setSheet({ type: 'form' });
      deepLink.current = null;
    }
  }, [meetings, projects]);

  const showToast = useCallback((message, action) => {
    setToast({ message, action });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), action ? 5200 : 2200);
  }, []);

  const current = sheet?.id && !String(sheet.type).startsWith('p') ? meetings.find((m) => m.id === sheet.id) : null;
  const curProject = sheet?.id && String(sheet.type).startsWith('p') ? projects.find((x) => x.id === sheet.id) : null;

  useEffect(() => {
    if (sheet?.id && !current && !curProject) setSheet(null);
  }, [sheet, current, curProject]);

  const closeTop = useCallback(() => {
    if (confirmId || confirmPid) { setConfirmId(null); setConfirmPid(null); }
    else if (sheet?.type === 'pform' && sheet.id) setSheet({ type: 'pdetail', id: sheet.id });
    else if (sheet?.type === 'form' && sheet.id) setSheet({ type: 'detail', id: sheet.id });
    else setSheet(null);
  }, [confirmId, confirmPid, sheet]);

  const overlayOpen = Boolean(sheet || confirmId || confirmPid);
  useBackButton(overlayOpen, closeTop);

  useEffect(() => {
    document.body.classList.toggle('no-scroll', overlayOpen);
    return () => document.body.classList.remove('no-scroll');
  }, [overlayOpen]);

  useEffect(() => {
    if (!overlayOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && closeTop();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [overlayOpen, closeTop]);

  const openDetail = (id) => {
    haptic.tap();
    setSheet({ type: 'detail', id });
  };
  const openAdd = (date) => {
    haptic.tap();
    setSheet({ type: 'form', date });
  };
  const openSettings = () => {
    haptic.tap();
    setSheet({ type: 'settings' });
  };

  const handleSave = (data) => {
    if (sheet.id) {
      setMeetings((list) => list.map((m) => (m.id === sheet.id ? { ...m, ...data, updatedAt: Date.now() } : m)));
      setSheet({ type: 'detail', id: sheet.id });
    } else {
      setMeetings((list) => [...list, { ...blank, id: newId(), createdAt: Date.now(), updatedAt: Date.now(), ...data }]);
      setSheet(null);
      setBurst((b) => b + 1);
    }
    setSelectedDate(data.date);
    haptic.success();
    showToast(t('toastSaved'));
  };

  // Tez qo'shish satridan: hamma narsa tushunilsa, darhol saqlanadi
  const quickCreate = (data) => {
    setMeetings((list) => [...list, { ...blank, ...data, checklist: [], id: newId(), createdAt: Date.now(), updatedAt: Date.now() }]);
    setSelectedDate(data.date);
    setBurst((b) => b + 1);
    haptic.success();
    showToast(t('toastSaved'));
  };
  const quickForm = (data) => setSheet({ type: 'form', date: data.date, prefill: data });

  const toggleItem = (meetingId, itemId) => {
    haptic.select();
    setMeetings((list) =>
      list.map((m) =>
        m.id === meetingId ? { ...m, updatedAt: Date.now(), checklist: m.checklist.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)) } : m,
      ),
    );
  };

  const setStatus = (id, status) => {
    haptic.select();
    setMeetings((list) => list.map((m) => (m.id === id ? { ...m, status, updatedAt: Date.now() } : m)));
    if (status === 'done') setBurst((b) => b + 1);
    showToast(t('toastDone'));
  };

  const removeMeeting = (id) => {
    const m = meetingsRef.current.find((x) => x.id === id);
    deletedRef.current = [...deletedRef.current, id];
    saveDeleted(deletedRef.current);
    setMeetings((list) => list.filter((x) => x.id !== id));
    haptic.warning();
    return m;
  };

  // Surib o'chirish: darhol o'chadi, lekin 5 soniya ichida qaytarish mumkin
  const swipeDelete = (id) => {
    const m = removeMeeting(id);
    if (!m) return;
    showToast(t('toastDeletedUndo'), {
      label: t('undo'),
      fn: () => {
        setMeetings((list) => [...list, { ...m, id: newId(), updatedAt: Date.now() }]); // yangi id: serverdagi "o'chirilgan" belgisi bilan to'qnashmasligi uchun
        setToast(null);
        haptic.success();
        showToast(t('toastRestored'));
      },
    });
  };
  const swipeDone = (id) => setStatus(id, 'done');

  const handleDelete = () => {
    removeMeeting(confirmId);
    setConfirmId(null);
    setSheet(null);
    showToast(t('toastDeleted'));
  };

  const duplicate = (m) => {
    haptic.tap();
    const base = fromISODate(m.date);
    const next = toISODate(addDays(base < new Date() ? new Date() : base, base < new Date() ? 1 : 7));
    setSheet({
      type: 'form', date: next, titleKey: 'fDuplicate',
      prefill: { name: m.name, date: next, time: m.time, location: m.location, phone: m.phone, cat: m.cat, notes: m.notes, checklist: m.checklist.map((i) => ({ id: newId(), text: i.text, done: false })) },
    });
  };

  const ensureToken = async () => {
    if (!calToken.current) {
      clearTimeout(syncTimer.current);
      syncing.current = false;
      await doSync();
      calToken.current = await getCalendarToken();
    }
    return calToken.current;
  };
  const calendarAction = async (m, kind) => {
    try {
      if (kind === 'google') openExternal(googleCalUrl(m));
      else openExternal(`${window.location.origin}/api/cal/${await ensureToken()}.ics?m=${m.id}`);
    } catch {
      haptic.error();
      showToast(t('toastCalErr'));
    }
  };
  const calendarLink = async (flag) => {
    if (flag === 'copied') { showToast(t('toastLinkCopied')); return null; }
    try {
      const tok = await ensureToken();
      const host = window.location.host;
      return { https: `${window.location.origin}/api/cal/${tok}.ics`, webcal: `webcal://${host}/api/cal/${tok}.ics` };
    } catch {
      haptic.error();
      showToast(t('toastCalErr'));
      return null;
    }
  };

  // Taklif: uchrashuv serverda bo'lishi kerak, shuning uchun avval sinxronlaymiz.
  const handleInvite = async (id) => {
    setInviting(true);
    try {
      clearTimeout(syncTimer.current);
      syncing.current = false;
      await doSync();
      const { link, text } = await createInvite(id);
      const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
      if (isTelegram) openTelegramLink(url);
      else {
        await navigator.clipboard?.writeText(link);
        showToast(t('toastCopied'));
      }
      haptic.success();
    } catch {
      haptic.error();
      showToast(t('toastInviteErr'));
    } finally {
      setInviting(false);
    }
  };

  const savePlacesList = (list) => {
    const next = { list, at: Date.now() };
    savePlaces(next.list, next.at);
    setPlaces(next);
    scheduleSync();
  };
  const toggleFav = (text) => savePlacesList(places.list.includes(text) ? places.list.filter((p) => p !== text) : [...places.list, text].slice(-30));
  const recent = useMemo(() => {
    const seen = new Set();
    const out = [];
    [...meetings].sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt)).forEach((m) => {
      const p = m.location?.trim();
      if (p && !seen.has(p)) { seen.add(p); out.push(p); }
    });
    return out.slice(0, 5);
  }, [meetings]);

  const changeLang = (l) => {
    haptic.select();
    setLang(l);
    scheduleSync();
  };
  const changeTab = (next) => {
    if (next !== tab) haptic.select();
    setTab(next);
    window.scrollTo({ top: 0 });
  };

  /* ---------- Loyihalar ---------- */
  const touchProject = (id, fn) => setProjects((list) => list.map((x) => (x.id === id ? { ...x, ...fn(x), updatedAt: Date.now() } : x)));
  const openProject = (id) => { haptic.tap(); setSheet({ type: 'pdetail', id }); };
  const openProjectForm = (type) => { haptic.tap(); setSheet({ type: 'pform', ptype: typeof type === 'string' ? type : undefined }); };

  const saveProject = (data) => {
    if (sheet.id) {
      touchProject(sheet.id, () => data);
      setSheet({ type: 'pdetail', id: sheet.id });
    } else {
      const today = todayISO();
      const tasks = planTasks(data.type, today, data.date);
      setProjects((list) => [...list, { id: newId(), status: 'new', createdAt: Date.now(), updatedAt: Date.now(), tasks, ...data }]);
      setSheet(null);
      setBurst((b) => b + 1);
    }
    haptic.success();
    showToast(t('toastSaved'));
  };
  const projStatus = (id, status) => {
    haptic.select();
    touchProject(id, () => ({ status }));
    if (status === 'done') setBurst((b) => b + 1);
  };
  const projToggleTask = (id, taskId) => {
    haptic.select();
    touchProject(id, (x) => {
      const tasks = x.tasks.map((k) => (k.id === taskId ? { ...k, done: !k.done } : k));
      return { tasks, status: x.status === 'new' ? 'work' : x.status };
    });
  };
  const projRemoveTask = (id, taskId) => touchProject(id, (x) => ({ tasks: x.tasks.filter((k) => k.id !== taskId) }));
  const projAddTask = (id, text) => {
    haptic.select();
    touchProject(id, (x) => ({ tasks: [...x.tasks, { id: newId(), text, done: false, due: '' }] }));
    showToast(t('toastTaskAdded'));
  };
  const projShift = (id, n) => {
    haptic.select();
    touchProject(id, (x) => ({ date: shiftDate(x.date < todayISO() && n > 0 ? todayISO() : x.date, n) }));
  };
  const removeProject = (id) => {
    const x = projectsRef.current.find((k) => k.id === id);
    pdeletedRef.current = [...pdeletedRef.current, id];
    savePDeleted(pdeletedRef.current);
    setProjects((list) => list.filter((k) => k.id !== id));
    haptic.warning();
    return x;
  };
  const swipeProjDelete = (id) => {
    const x = removeProject(id);
    if (!x) return;
    showToast(t('toastDeletedUndo'), {
      label: t('undo'),
      fn: () => {
        setProjects((list) => [...list, { ...x, id: newId(), updatedAt: Date.now() }]);
        setToast(null);
        haptic.success();
        showToast(t('toastRestored'));
      },
    });
  };
  const handleProjDelete = () => {
    removeProject(confirmPid);
    setConfirmPid(null);
    setSheet(null);
    showToast(t('toastDeleted'));
  };

  const common = { meetings, now, onOpen: openDetail, onAdd: openAdd, onSettings: openSettings };
  return (
    <div className="app" data-lang={lang || getLang()}>
      <div className="aurora" aria-hidden="true"><i /><i /><i /></div>

      {tab === 'home' && (
        <HomeView {...common} projects={projects} onOpenProject={openProject} onOpenProjects={() => changeTab('projects')} selected={selectedDate} onSelect={setSelectedDate} onDone={swipeDone} onDelete={swipeDelete} onQuickCreate={quickCreate} onQuickForm={quickForm} />
      )}
      {tab === 'calendar' && (
        <CalendarView {...common} selected={selectedDate} onSelect={setSelectedDate} onDone={swipeDone} onDelete={swipeDelete} />
      )}
      {tab === 'projects' && (
        <ProjectsView projects={projects} now={now} onOpen={openProject} onAdd={openProjectForm} onDone={(id) => projStatus(id, 'done')} onDelete={swipeProjDelete} onSettings={openSettings} />
      )}
      {tab === 'stats' && <StatsView meetings={meetings} now={now} onSettings={openSettings} />}

      <TabBar tab={tab} onTab={changeTab} onAdd={() => (tab === 'projects' ? openProjectForm() : openAdd(tab === 'calendar' ? selectedDate : undefined))} />

      {sheet?.type === 'detail' && current && (
        <MeetingDetail
          meeting={current}
          now={now}
          inviting={inviting}
          onToggle={(itemId) => toggleItem(current.id, itemId)}
          onStatus={(s) => setStatus(current.id, s)}
          onInvite={() => handleInvite(current.id)}
          onDuplicate={() => duplicate(current)}
          onCalendar={(kind) => calendarAction(current, kind)}
          onEdit={() => setSheet({ type: 'form', id: current.id })}
          onDelete={() => setConfirmId(current.id)}
          onClose={closeTop}
        />
      )}

      {sheet?.type === 'form' && (sheet.id ? current : true) && (
        <MeetingForm
          key={sheet.id ?? 'new'}
          initial={current}
          presetDate={sheet.date}
          prefill={sheet.prefill}
          titleKey={sheet.titleKey}
          favorites={places.list}
          recent={recent}
          onToggleFav={toggleFav}
          onSave={handleSave}
          onClose={closeTop}
        />
      )}

      {sheet?.type === 'pdetail' && curProject && (
        <ProjectDetail
          project={curProject}
          onClose={closeTop}
          onEdit={() => setSheet({ type: 'pform', id: curProject.id })}
          onDelete={() => setConfirmPid(curProject.id)}
          onStatus={(st) => projStatus(curProject.id, st)}
          onToggleTask={(tid) => projToggleTask(curProject.id, tid)}
          onRemoveTask={(tid) => projRemoveTask(curProject.id, tid)}
          onAddTask={(text) => projAddTask(curProject.id, text)}
          onShift={(n) => projShift(curProject.id, n)}
        />
      )}

      {sheet?.type === 'pform' && (sheet.id ? curProject : true) && (
        <ProjectForm key={sheet.id ?? 'pnew'} initial={curProject} presetType={sheet.ptype} onSave={saveProject} onClose={closeTop} />
      )}

      {sheet?.type === 'settings' && (
        <SettingsSheet places={places.list} onLang={changeLang} onRemovePlace={(p) => savePlacesList(places.list.filter((x) => x !== p))} onCalendarLink={calendarLink} onClose={closeTop} />
      )}

      {confirmId && (
        <ConfirmDialog title={t('cDelTitle')} text={t('cDelText')} confirmLabel={t('cDelYes')} onConfirm={handleDelete} onCancel={() => setConfirmId(null)} />
      )}

      {confirmPid && (
        <ConfirmDialog title={t('pjDelTitle')} text={t('pjDelText')} confirmLabel={t('cDelYes')} onConfirm={handleProjDelete} onCancel={() => setConfirmPid(null)} />
      )}

      <Confetti burst={burst} />
      <Toast toast={toast} />
    </div>
  );
}
