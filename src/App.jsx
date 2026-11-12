import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HomeView from './components/HomeView.jsx';
import CalendarView from './components/CalendarView.jsx';
import StatsView from './components/StatsView.jsx';
import ProjectsView from './components/ProjectsView.jsx';
import ProjectDetail from './components/ProjectDetail.jsx';
import ProjectForm from './components/ProjectForm.jsx';
import SubSheet from './components/SubSheet.jsx';
import ClientDetail from './components/ClientDetail.jsx';
import ExpenseSheet from './components/ExpenseSheet.jsx';
import ServiceSheet from './components/ServiceSheet.jsx';
import MessageSheet from './components/MessageSheet.jsx';
import PayableSheet from './components/PayableSheet.jsx';
import { payNow, undoLast, left as payLeft } from './lib/payables.js';
import { clientsOf } from './lib/finance.js';
import MeetingDetail from './components/MeetingDetail.jsx';
import MeetingForm from './components/MeetingForm.jsx';
import SettingsSheet from './components/SettingsSheet.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import TabBar from './components/TabBar.jsx';
import Toast from './components/Toast.jsx';
import Confetti from './components/Confetti.jsx';
import {
  loadMeetings, saveMeetings, loadDeleted, saveDeleted, loadPlaces, savePlaces, syncRemote, createInvite, createReport, runSeo, requestPrompt, buildMessage, checkClaudeLink, getCalendarToken, signature,
  loadProjects, saveProjects, loadPDeleted, savePDeleted, projSignature, loadSubs, saveSubs, loadSDeleted, saveSDeleted, subsSignature, loadExpenses, saveExpenses, loadEDeleted, saveEDeleted, expensesSignature, loadGoal, saveGoal, loadServices, saveServices, loadSvDeleted, saveSvDeleted, servicesSignature, loadPayables, savePayables, loadPvDeleted, savePvDeleted, payablesSignature,
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
  const [subs, setSubs] = useState(loadSubs);
  const [expenses, setExpenses] = useState(loadExpenses);
  const [services, setServices] = useState(loadServices);
  const [payables, setPayables] = useState(loadPayables);
  const [confirmPay, setConfirmPay] = useState(null);
  const [confirmSv, setConfirmSv] = useState(null);
  const [goalState, setGoalState] = useState(loadGoal);
  const [confirmSid, setConfirmSid] = useState(null);
  const [confirmPid, setConfirmPid] = useState(null);
  const [tab, setTab] = useState('home');
  const [selectedDate, setSelectedDate] = useState(todayISO);
  // sheet: null | { type: 'detail', id } | { type: 'form', id?, date?, prefill?, titleKey? } | { type: 'settings' }
  const [sheet, setSheet] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [toast, setToast] = useState(null);
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false));
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
  const subsRef = useRef(subs);
  subsRef.current = subs;
  const payablesRef = useRef(payables);
  payablesRef.current = payables;
  const pvdeletedRef = useRef(loadPvDeleted());
  const pvFromServer = useRef(false);
  const servicesRef = useRef(services);
  servicesRef.current = services;
  const svdeletedRef = useRef(loadSvDeleted());
  const svFromServer = useRef(false);
  const expensesRef = useRef(expenses);
  expensesRef.current = expenses;
  const edeletedRef = useRef(loadEDeleted());
  const eFromServer = useRef(false);
  const goalRef = useRef(goalState);
  goalRef.current = goalState;
  const sdeletedRef = useRef(loadSDeleted());
  const sFromServer = useRef(false);
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
      const sentSDeleted = [...sdeletedRef.current];
      const sentEDeleted = [...edeletedRef.current];
      const sentSvDeleted = [...svdeletedRef.current];
      const sentPvDeleted = [...pvdeletedRef.current];
      const remote = await syncRemote({
        meetings: meetingsRef.current,
        deleted: sentDeleted,
        lang: hasSavedLang() ? langRef.current : undefined,
        places: placesRef.current.list,
        placesAt: placesRef.current.at,
        projects: projectsRef.current,
        pdeleted: [...pdeletedRef.current],
        subs: subsRef.current,
        sdeleted: sentSDeleted,
        expenses: expensesRef.current,
        edeleted: sentEDeleted,
        services: servicesRef.current,
        svdeleted: sentSvDeleted,
        payables: payablesRef.current,
        pvdeleted: sentPvDeleted,
        goal: goalRef.current.goal,
        goalAt: goalRef.current.at,
      });
      if (remote) {
        deletedRef.current = deletedRef.current.filter((id) => !sentDeleted.includes(id));
        saveDeleted(deletedRef.current);
        pdeletedRef.current = pdeletedRef.current.filter((id) => !sentPDeleted.includes(id));
        savePDeleted(pdeletedRef.current);
        sdeletedRef.current = sdeletedRef.current.filter((id) => !sentSDeleted.includes(id));
        saveSDeleted(sdeletedRef.current);
        edeletedRef.current = edeletedRef.current.filter((id) => !sentEDeleted.includes(id));
        saveEDeleted(edeletedRef.current);
        svdeletedRef.current = svdeletedRef.current.filter((id) => !sentSvDeleted.includes(id));
        saveSvDeleted(svdeletedRef.current);
        pvdeletedRef.current = pvdeletedRef.current.filter((id) => !sentPvDeleted.includes(id));
        savePvDeleted(pvdeletedRef.current);
        if (payablesSignature(remote.payables) !== payablesSignature(payablesRef.current)) {
          pvFromServer.current = true;
          setPayables(remote.payables);
        }
        if (servicesSignature(remote.services) !== servicesSignature(servicesRef.current)) {
          svFromServer.current = true;
          setServices(remote.services);
        }
        if (expensesSignature(remote.expenses) !== expensesSignature(expensesRef.current)) {
          eFromServer.current = true;
          setExpenses(remote.expenses);
        }
        if (remote.goalAt > goalRef.current.at) {
          saveGoal(remote.goal, remote.goalAt);
          setGoalState({ goal: remote.goal, at: remote.goalAt });
        }
        if (subsSignature(remote.subs) !== subsSignature(subsRef.current)) {
          sFromServer.current = true;
          setSubs(remote.subs);
        }
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
    savePayables(payables);
    if (pvFromServer.current) {
      pvFromServer.current = false;
      return;
    }
    scheduleSync();
  }, [payables, scheduleSync]);

  useEffect(() => {
    saveServices(services);
    if (svFromServer.current) {
      svFromServer.current = false;
      return;
    }
    scheduleSync();
  }, [services, scheduleSync]);

  useEffect(() => {
    saveExpenses(expenses);
    if (eFromServer.current) {
      eFromServer.current = false;
      return;
    }
    scheduleSync();
  }, [expenses, scheduleSync]);

  useEffect(() => {
    saveSubs(subs);
    if (sFromServer.current) {
      sFromServer.current = false;
      return;
    }
    scheduleSync();
  }, [subs, scheduleSync]);

  useEffect(() => {
    saveProjects(projects);
    if (pFromServer.current) {
      pFromServer.current = false;
      return;
    }
    scheduleSync();
  }, [projects, scheduleSync]);

  useEffect(() => {
    const on = () => { setOnline(true); doSync(); };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, [doSync]);

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

  const curPayable = sheet?.type === 'payable' && sheet.payid ? payables.find((x) => x.id === sheet.payid) : null;
  const curService = sheet?.type === 'service' && sheet.svid ? services.find((x) => x.id === sheet.svid) : null;
  const curSub = sheet?.type === 'sub' && sheet.sid ? subs.find((x) => x.id === sheet.sid) : null;
  const clientList = useMemo(() => clientsOf(projects, subs), [projects, subs]);
  const clientNames = useMemo(() => clientList.map((c) => c.name), [clientList]);
  const curClient = sheet?.type === 'client' ? clientList.find((c) => c.key === sheet.ckey) : null;

  useEffect(() => {
    if (sheet?.id && !current && !curProject) setSheet(null);
  }, [sheet, current, curProject]);

  const closeTop = useCallback(() => {
    if (confirmId || confirmPid || confirmSid || confirmSv || confirmPay) { setConfirmId(null); setConfirmPid(null); setConfirmSid(null); setConfirmSv(null); setConfirmPay(null); }
    else if (sheet?.type === 'msg' && sheet.back) setSheet(sheet.back);
    else if (sheet?.type === 'pform' && sheet.id) setSheet({ type: 'pdetail', id: sheet.id });
    else if (sheet?.type === 'form' && sheet.id) setSheet({ type: 'detail', id: sheet.id });
    else setSheet(null);
  }, [confirmId, confirmPid, confirmSid, confirmSv, confirmPay, sheet]);

  const overlayOpen = Boolean(sheet || confirmId || confirmPid || confirmSid || confirmSv || confirmPay);
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

  const handleReport = async (p) => {
    setInviting(true);
    try {
      clearTimeout(syncTimer.current);
      syncing.current = false;
      await doSync();
      const link = await createReport(p.id);
      if (isTelegram) openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(p.name)}`);
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
  const projPay = (id, amount) => {
    haptic.success();
    touchProject(id, (x) => ({ paid: (x.paid || 0) + amount, pays: [...(x.pays || []), { a: amount, d: todayISO() }].slice(-40) }));
    showToast(t('toastPaid'));
  };
  // SEO va topshiriq serverda bajariladi: servis avval sinxronlanishi kerak
  const withSynced = async (fn) => {
    clearTimeout(syncTimer.current);
    syncing.current = false;
    await doSync();
    return fn();
  };
  const seoCheck = (id) => withSynced(() => runSeo(id)).then((r) => { doSync(); return r; });
  const svPrompt = (id, rid) => withSynced(() => requestPrompt(id, rid));
  const linkCheck = (id) => withSynced(() => checkClaudeLink(id)).then((r) => { doSync(); return r; });
  const openMsg = (kind, id, name, back) => { haptic.tap(); setSheet({ type: 'msg', refId: id, kind, name, back }); };
  const touchPayable = (id, fn) => setPayables((list) => list.map((x) => (x.id === id ? { ...x, ...fn(x), updatedAt: Date.now() } : x)));
  const payAmount = (id, amount) => {
    const r = payNow(payablesRef.current, expensesRef.current, id, amount, todayISO());
    setPayables(r.payables);
    setExpenses(r.expenses);
    haptic.success();
    showToast(t('pvPaidToast'));
  };
  const payFull = (id) => {
    const x = payablesRef.current.find((p) => p.id === id);
    if (x) payAmount(id, payLeft(x));
  };
  const undoPay = (id) => {
    const r = undoLast(payablesRef.current, expensesRef.current, id);
    pvdeletedRef.current = [...pvdeletedRef.current, ...(r.removed || [])];
    savePvDeleted(pvdeletedRef.current);
    edeletedRef.current = [...edeletedRef.current, ...(r.goneExpenses || [])];
    saveEDeleted(edeletedRef.current);
    setPayables(r.payables);
    setExpenses(r.expenses);
    haptic.select();
  };
  const savePayable = (data) => {
    if (sheet?.payid) touchPayable(sheet.payid, () => data);
    else setPayables((list) => [...list, { id: newId(), paid: 0, pays: [], nextId: '', createdAt: Date.now(), updatedAt: Date.now(), ...data }]);
    setSheet(null);
    haptic.success();
    showToast(t('toastSaved'));
  };
  const handlePayDelete = () => {
    const id = confirmPay;
    pvdeletedRef.current = [...pvdeletedRef.current, id];
    savePvDeleted(pvdeletedRef.current);
    setPayables((list) => list.filter((x) => x.id !== id));
    setConfirmPay(null);
    setSheet(null);
    haptic.success();
  };
  const touchService = (id, fn) => setServices((list) => list.map((x) => (x.id === id ? { ...x, ...fn(x), updatedAt: Date.now() } : x)));
  const saveService = (data) => {
    if (sheet?.svid) touchService(sheet.svid, () => data);
    else {
      const id = newId();
      setServices((list) => [...list, { id, requests: [], changes: [], createdAt: Date.now(), updatedAt: Date.now(), ...data }]);
      setSheet({ type: 'service', svid: id });
    }
    haptic.success();
    showToast(t('toastSaved'));
  };
  const addSvRequest = (text) => {
    haptic.select();
    touchService(sheet.svid, (x) => ({ requests: [...x.requests, { id: newId(), d: todayISO(), text, done: false }].slice(-50) }));
  };
  const toggleSvRequest = (rid) =>
    touchService(sheet.svid, (x) => {
      const r = x.requests.find((q) => q.id === rid);
      if (!r) return {};
      const done = !r.done;
      // Bajarilgan soʻrov avtomatik oʻzgartirishlar tarixiga yoziladi (qaytarilsa — olib tashlanadi)
      const changes = done ? [...x.changes, { id: newId(), d: todayISO(), text: r.text, rid }].slice(-200) : x.changes.filter((c) => c.rid !== rid);
      return { requests: x.requests.map((q) => (q.id === rid ? { ...q, done } : q)), changes };
    });
  const addSvChange = (text) => touchService(sheet.svid, (x) => ({ changes: [...x.changes, { id: newId(), d: todayISO(), text, rid: '' }].slice(-200) }));
  const removeSvChange = (cid) => touchService(sheet.svid, (x) => ({ changes: x.changes.filter((c) => c.id !== cid) }));
  const removeSvRequest = (rid) => touchService(sheet.svid, (x) => ({ requests: x.requests.filter((r) => r.id !== rid) }));
  const handleSvDelete = () => {
    const id = confirmSv;
    svdeletedRef.current = [...svdeletedRef.current, id];
    saveSvDeleted(svdeletedRef.current);
    setServices((list) => list.filter((x) => x.id !== id));
    setConfirmSv(null);
    setSheet(null);
    haptic.success();
  };
  const projectToService = (p) => {
    haptic.tap();
    setSheet({ type: 'service', fromProject: p.id });
  };
  const addExpense = (data) => {
    setExpenses((list) => [{ id: newId(), createdAt: Date.now(), updatedAt: Date.now(), ...data }, ...list]);
    setSheet(null);
    haptic.success();
    showToast(t('toastSaved'));
  };
  const deleteExpense = (id) => {
    edeletedRef.current = [...edeletedRef.current, id];
    saveEDeleted(edeletedRef.current);
    setExpenses((list) => list.filter((x) => x.id !== id));
    haptic.select();
  };
  const setGoal = (n) => {
    const next = { goal: n, at: Date.now() };
    saveGoal(next.goal, next.at);
    setGoalState(next);
    scheduleSync();
    haptic.success();
  };
  const touchSub = (id, fn) => setSubs((list) => list.map((x) => (x.id === id ? { ...x, ...fn(x), updatedAt: Date.now() } : x)));
  const saveSub = (data) => {
    if (sheet?.sid) touchSub(sheet.sid, () => data);
    else setSubs((list) => [...list, { id: newId(), active: true, last: '', pays: [], createdAt: Date.now(), updatedAt: Date.now(), ...data }]);
    setSheet(null);
    haptic.success();
    showToast(t('toastSaved'));
  };
  const paySubNow = (id) => {
    haptic.success();
    const d = todayISO();
    touchSub(id, (x) => ({ last: d.slice(0, 7), pays: [...(x.pays || []), { a: x.amount, d }].slice(-60) }));
    showToast(t('toastPaid'));
  };
  const toggleSub = (id) => touchSub(id, (x) => ({ active: !x.active }));
  const handleSubDelete = () => {
    const id = confirmSid;
    sdeletedRef.current = [...sdeletedRef.current, id];
    saveSDeleted(sdeletedRef.current);
    setSubs((list) => list.filter((x) => x.id !== id));
    setConfirmSid(null);
    setSheet(null);
    haptic.success();
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
        <ProjectsView projects={projects} subs={subs} services={services} payables={payables} onOpenPayable={(id) => { haptic.tap(); setSheet({ type: 'payable', payid: id }); }} onAddPayable={() => { haptic.tap(); setSheet({ type: 'payable' }); }} onPayNow={payFull} onOpenService={(id) => { haptic.tap(); setSheet({ type: 'service', svid: id }); }} onAddService={() => { haptic.tap(); setSheet({ type: 'service' }); }} now={now} onOpenClient={(key) => { haptic.tap(); setSheet({ type: 'client', ckey: key }); }} onOpenSub={(id) => { haptic.tap(); setSheet({ type: 'sub', sid: id }); }} onAddSub={() => { haptic.tap(); setSheet({ type: 'sub' }); }} onPaySub={paySubNow} onOpen={openProject} onAdd={openProjectForm} onDone={(id) => projStatus(id, 'done')} onDelete={swipeProjDelete} onSettings={openSettings} />
      )}
      {tab === 'stats' && <StatsView meetings={meetings} projects={projects} subs={subs} expenses={expenses} goal={goalState.goal} onAddExpense={() => { haptic.tap(); setSheet({ type: 'expense' }); }} onDeleteExpense={deleteExpense} onSetGoal={setGoal} now={now} onSettings={openSettings} />}

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
          onPay={(a) => projPay(curProject.id, a)}
          onReport={() => handleReport(curProject)}
          onToService={() => projectToService(curProject)}
          onMsg={() => openMsg('project', curProject.id, curProject.name, { type: 'pdetail', id: curProject.id })}
          busy={inviting}
        />
      )}

      {sheet?.type === 'pform' && (sheet.id ? curProject : true) && (
        <ProjectForm key={sheet.id ?? 'pnew'} initial={curProject} presetType={sheet.ptype} onSave={saveProject} onClose={closeTop} />
      )}

      {sheet?.type === 'service' && (!sheet.svid || curService) && (
        <ServiceSheet
          key={sheet.svid ?? (sheet.fromProject ? `from-${sheet.fromProject}` : 'svnew')}
          service={curService}
          fromProject={sheet.fromProject ? projects.find((x) => x.id === sheet.fromProject) : null}
          onSave={saveService}
          onSeo={seoCheck}
          onPrompt={svPrompt}
          onLinkCheck={linkCheck}
          onMsg={() => openMsg('service', curService.id, curService.name, { type: 'service', svid: curService.id })}
          onAddChange={addSvChange}
          onRemoveChange={removeSvChange}
          onDelete={() => setConfirmSv(sheet.svid)}
          onAddRequest={addSvRequest}
          onToggleRequest={toggleSvRequest}
          onRemoveRequest={removeSvRequest}
          onClose={closeTop}
        />
      )}

      {sheet?.type === 'payable' && (!sheet.payid || curPayable) && (
        <PayableSheet
          key={sheet.payid ?? 'paynew'}
          item={curPayable}
          projects={projects}
          onSave={savePayable}
          onPay={(a) => payAmount(sheet.payid, a)}
          onUndo={() => undoPay(sheet.payid)}
          onSnooze={(due) => touchPayable(sheet.payid, () => ({ due }))}
          onDelete={() => setConfirmPay(sheet.payid)}
          onClose={closeTop}
        />
      )}

      {sheet?.type === 'msg' && (
        <MessageSheet
          key={sheet.refId}
          title={sheet.name}
          kinds={sheet.kind === 'project' ? ['pay', 'done', 'delay'] : ['renew', 'upd']}
          onBuild={(kind, lang) => withSynced(() => buildMessage(sheet.refId, kind, lang))}
          onClose={closeTop}
        />
      )}

      {sheet?.type === 'expense' && <ExpenseSheet projects={projects} onSave={addExpense} onClose={closeTop} />}

      {sheet?.type === 'sub' && (!sheet.sid || curSub) && (
        <SubSheet
          key={sheet.sid ?? 'snew'}
          sub={curSub}
          clientNames={clientNames}
          onSave={saveSub}
          onPay={() => paySubNow(sheet.sid)}
          onToggle={() => toggleSub(sheet.sid)}
          onDelete={() => setConfirmSid(sheet.sid)}
          onClose={closeTop}
        />
      )}

      {sheet?.type === 'client' && curClient && (
        <ClientDetail
          client={curClient}
          onOpenProject={(id) => setSheet({ type: 'pdetail', id })}
          onOpenSub={(id) => setSheet({ type: 'sub', sid: id })}
          onClose={closeTop}
        />
      )}

      {sheet?.type === 'settings' && (
        <SettingsSheet places={places.list} onLang={changeLang} onRemovePlace={(p) => savePlacesList(places.list.filter((x) => x !== p))} onCalendarLink={calendarLink} onClose={closeTop} />
      )}

      {confirmId && (
        <ConfirmDialog title={t('cDelTitle')} text={t('cDelText')} confirmLabel={t('cDelYes')} onConfirm={handleDelete} onCancel={() => setConfirmId(null)} />
      )}

      {confirmPay && (
        <ConfirmDialog title={t('pvDelTitle')} text={t('pvDelText')} confirmLabel={t('cDelYes')} onConfirm={handlePayDelete} onCancel={() => setConfirmPay(null)} />
      )}

      {confirmSv && (
        <ConfirmDialog title={t('svDelTitle')} text={t('svDelText')} confirmLabel={t('cDelYes')} onConfirm={handleSvDelete} onCancel={() => setConfirmSv(null)} />
      )}

      {confirmSid && (
        <ConfirmDialog title={t('subDelTitle')} text={t('subDelText')} confirmLabel={t('cDelYes')} onConfirm={handleSubDelete} onCancel={() => setConfirmSid(null)} />
      )}

      {confirmPid && (
        <ConfirmDialog title={t('pjDelTitle')} text={t('pjDelText')} confirmLabel={t('cDelYes')} onConfirm={handleProjDelete} onCancel={() => setConfirmPid(null)} />
      )}

      {!online && <div className="offline-bar" role="status">📡 {t('offBar')}</div>}

      <Confetti burst={burst} />
      <Toast toast={toast} />
    </div>
  );
}
