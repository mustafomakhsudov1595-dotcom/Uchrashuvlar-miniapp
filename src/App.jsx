import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import UpcomingView from './components/UpcomingView.jsx';
import CalendarView from './components/CalendarView.jsx';
import MeetingDetail from './components/MeetingDetail.jsx';
import MeetingForm from './components/MeetingForm.jsx';
import SettingsSheet from './components/SettingsSheet.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import TabBar from './components/TabBar.jsx';
import Toast from './components/Toast.jsx';
import {
  loadMeetings, saveMeetings, loadDeleted, saveDeleted, loadPlaces, savePlaces, syncRemote, createInvite, signature,
} from './lib/storage.js';
import { newId } from './lib/meetings.js';
import { todayISO } from './lib/dates.js';
import { haptic, isTelegram, openTelegramLink } from './lib/telegram.js';
import { useBackButton, useNow } from './lib/hooks.js';
import { getLang, hasSavedLang, setLang, t, useLang } from './lib/i18n.js';

export default function App() {
  const lang = useLang(); // til o'zgarsa butun ilova qayta chiziladi
  const [meetings, setMeetings] = useState(loadMeetings);
  const [places, setPlaces] = useState(() => loadPlaces());
  const [tab, setTab] = useState('upcoming');
  const [selectedDate, setSelectedDate] = useState(todayISO);
  // sheet: null | { type: 'detail', id } | { type: 'form', id?, date? } | { type: 'settings' }
  const [sheet, setSheet] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const now = useNow();

  const meetingsRef = useRef(meetings);
  meetingsRef.current = meetings;
  const placesRef = useRef(places);
  placesRef.current = places;
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
      const remote = await syncRemote({
        meetings: meetingsRef.current,
        deleted: sentDeleted,
        lang: hasSavedLang() ? langRef.current : undefined,
        places: placesRef.current.list,
        placesAt: placesRef.current.at,
      });
      if (remote) {
        deletedRef.current = deletedRef.current.filter((id) => !sentDeleted.includes(id));
        saveDeleted(deletedRef.current);
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
    const editId = p.get('edit');
    if (editId && meetings.some((m) => m.id === editId)) {
      setSheet({ type: 'form', id: editId });
      deepLink.current = null;
    } else if (p.get('new')) {
      setSheet({ type: 'form' });
      deepLink.current = null;
    }
  }, [meetings]);

  const showToast = useCallback((message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const current = sheet?.id ? meetings.find((m) => m.id === sheet.id) : null;

  // Ochiq oyna o'chib ketgan uchrashuvga tegishli bo'lsa, yopamiz.
  useEffect(() => {
    if (sheet?.id && !current) setSheet(null);
  }, [sheet, current]);

  // Eng ustidagi qatlamni yopadi: avval tasdiqlash oynasi, keyin forma/tafsilot.
  const closeTop = useCallback(() => {
    if (confirmId) {
      setConfirmId(null);
    } else if (sheet?.type === 'form' && sheet.id) {
      setSheet({ type: 'detail', id: sheet.id });
    } else {
      setSheet(null);
    }
  }, [confirmId, sheet]);

  const overlayOpen = Boolean(sheet || confirmId);
  useBackButton(overlayOpen, closeTop);

  useEffect(() => {
    document.body.classList.toggle('no-scroll', overlayOpen);
    return () => document.body.classList.remove('no-scroll');
  }, [overlayOpen]);

  useEffect(() => {
    if (!overlayOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') closeTop();
    };
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

  const handleSave = (data) => {
    if (sheet.id) {
      setMeetings((list) => list.map((m) => (m.id === sheet.id ? { ...m, ...data, updatedAt: Date.now() } : m)));
      setSheet({ type: 'detail', id: sheet.id });
    } else {
      setMeetings((list) => [...list, { id: newId(), createdAt: Date.now(), updatedAt: Date.now(), status: '', from: '', src: '', guests: 0, lat: null, lon: null, ...data }]);
      setSheet(null);
    }
    setSelectedDate(data.date);
    haptic.success();
    showToast(t('toastSaved'));
  };

  const toggleItem = (meetingId, itemId) => {
    haptic.select();
    setMeetings((list) =>
      list.map((m) =>
        m.id === meetingId
          ? { ...m, updatedAt: Date.now(), checklist: m.checklist.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)) }
          : m,
      ),
    );
  };

  const setStatus = (id, status) => {
    haptic.select();
    setMeetings((list) => list.map((m) => (m.id === id ? { ...m, status, updatedAt: Date.now() } : m)));
    showToast(t('toastDone'));
  };

  const handleDelete = () => {
    deletedRef.current = [...deletedRef.current, confirmId];
    saveDeleted(deletedRef.current);
    setMeetings((list) => list.filter((m) => m.id !== confirmId));
    setConfirmId(null);
    setSheet(null);
    haptic.warning();
    showToast(t('toastDeleted'));
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

  // Sevimli joylar
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
  };

  const openSettings = () => { haptic.tap(); setSheet({ type: 'settings' }); };

  return (
    <div className="app" data-lang={lang || getLang()}>
      {tab === 'upcoming' ? (
        <UpcomingView meetings={meetings} now={now} onOpen={openDetail} onAdd={openAdd} onSettings={openSettings} />
      ) : (
        <CalendarView
          meetings={meetings}
          now={now}
          selected={selectedDate}
          onSelect={setSelectedDate}
          onOpen={openDetail}
          onAdd={openAdd}
          onSettings={openSettings}
        />
      )}

      <TabBar tab={tab} onTab={changeTab} onAdd={() => openAdd(tab === 'calendar' ? selectedDate : undefined)} />

      {sheet?.type === 'detail' && current && (
        <MeetingDetail
          meeting={current}
          now={now}
          inviting={inviting}
          onToggle={(itemId) => toggleItem(current.id, itemId)}
          onStatus={(s) => setStatus(current.id, s)}
          onInvite={() => handleInvite(current.id)}
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
          favorites={places.list}
          recent={recent}
          onToggleFav={toggleFav}
          onSave={handleSave}
          onClose={closeTop}
        />
      )}

      {sheet?.type === 'settings' && (
        <SettingsSheet
          places={places.list}
          onLang={changeLang}
          onRemovePlace={(p) => savePlacesList(places.list.filter((x) => x !== p))}
          onClose={closeTop}
        />
      )}

      {confirmId && (
        <ConfirmDialog
          title={t('cDelTitle')}
          text={t('cDelText')}
          confirmLabel={t('cDelYes')}
          onConfirm={handleDelete}
          onCancel={() => setConfirmId(null)}
        />
      )}

      <Toast message={toast} />
    </div>
  );
}
