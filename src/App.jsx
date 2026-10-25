import { useCallback, useEffect, useRef, useState } from 'react';
import UpcomingView from './components/UpcomingView.jsx';
import CalendarView from './components/CalendarView.jsx';
import MeetingDetail from './components/MeetingDetail.jsx';
import MeetingForm from './components/MeetingForm.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import TabBar from './components/TabBar.jsx';
import Toast from './components/Toast.jsx';
import { loadMeetings, saveMeetings, loadDeleted, saveDeleted, syncRemote, signature } from './lib/storage.js';
import { newId } from './lib/meetings.js';
import { todayISO } from './lib/dates.js';
import { haptic, isTelegram } from './lib/telegram.js';
import { useBackButton, useNow } from './lib/hooks.js';

export default function App() {
  const [meetings, setMeetings] = useState(loadMeetings);
  const [tab, setTab] = useState('upcoming');
  const [selectedDate, setSelectedDate] = useState(todayISO);
  // sheet: null | { type: 'detail', id } | { type: 'form', id?, date? }
  const [sheet, setSheet] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const now = useNow();

  const meetingsRef = useRef(meetings);
  meetingsRef.current = meetings;
  const deletedRef = useRef(loadDeleted());
  const fromServer = useRef(false);
  const syncing = useRef(false);
  const syncTimer = useRef(null);

  // Serverga yuboradi va birlashtirilgan ro'yxatni qaytarib oladi.
  const doSync = useCallback(async () => {
    if (!isTelegram || syncing.current) return;
    syncing.current = true;
    try {
      const sentDeleted = [...deletedRef.current];
      const remote = await syncRemote(meetingsRef.current, sentDeleted);
      if (remote) {
        deletedRef.current = deletedRef.current.filter((id) => !sentDeleted.includes(id));
        saveDeleted(deletedRef.current);
        if (signature(remote) !== signature(meetingsRef.current)) {
          fromServer.current = true;
          setMeetings(remote);
        }
      }
    } catch {
      /* tarmoq yo'q — keyingi safar urinamiz */
    } finally {
      syncing.current = false;
    }
  }, []);

  useEffect(() => {
    saveMeetings(meetings);
    if (fromServer.current) {
      fromServer.current = false;
      return;
    }
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(doSync, 600);
  }, [meetings, doSync]);

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
      setMeetings((list) => [...list, { id: newId(), createdAt: Date.now(), updatedAt: Date.now(), ...data }]);
      setSheet(null);
    }
    setSelectedDate(data.date);
    haptic.success();
    showToast('Saqlandi');
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

  const handleDelete = () => {
    deletedRef.current = [...deletedRef.current, confirmId];
    saveDeleted(deletedRef.current);
    setMeetings((list) => list.filter((m) => m.id !== confirmId));
    setConfirmId(null);
    setSheet(null);
    haptic.warning();
    showToast('Oʻchirildi');
  };

  const changeTab = (next) => {
    if (next !== tab) haptic.select();
    setTab(next);
  };

  return (
    <div className="app">
      {tab === 'upcoming' ? (
        <UpcomingView meetings={meetings} now={now} onOpen={openDetail} onAdd={openAdd} />
      ) : (
        <CalendarView
          meetings={meetings}
          now={now}
          selected={selectedDate}
          onSelect={setSelectedDate}
          onOpen={openDetail}
          onAdd={openAdd}
        />
      )}

      <TabBar tab={tab} onTab={changeTab} onAdd={() => openAdd(tab === 'calendar' ? selectedDate : undefined)} />

      {sheet?.type === 'detail' && current && (
        <MeetingDetail
          meeting={current}
          now={now}
          onToggle={(itemId) => toggleItem(current.id, itemId)}
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
          onSave={handleSave}
          onClose={closeTop}
        />
      )}

      {confirmId && (
        <ConfirmDialog
          title="Uchrashuvni oʻchirasizmi?"
          text="Bu amalni qaytarib boʻlmaydi."
          confirmLabel="Oʻchirish"
          onConfirm={handleDelete}
          onCancel={() => setConfirmId(null)}
        />
      )}

      <Toast message={toast} />
    </div>
  );
}
