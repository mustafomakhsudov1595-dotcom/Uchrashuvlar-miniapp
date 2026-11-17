import { useState } from 'react';
import { loginRemote } from '../lib/storage.js';
import { t } from '../lib/i18n.js';

// Hisobga kirmagan: ilova login va parol soʻraydi (bitta kampaniya = bitta login/parol)
export default function LoginGate({ onDone }) {
  const [login, setLogin] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!login.trim() || !pass) return setErr(t('lgEmpty'));
    setBusy(true);
    setErr('');
    try {
      const r = await loginRemote(login.trim().toLowerCase(), pass);
      if (r.ok || r.error === 'already') onDone();
      else setErr(r.error === 'lock' ? t('lgLock') : r.error === 'bad' ? t('lgBad') : t('lgNet'));
    } catch {
      setErr(t('lgNet'));
    }
    setBusy(false);
  };
  return (
    <main className="login-gate">
      <div className="lg-ico">🔐</div>
      <h1>{t('lgTitle')}</h1>
      <p>{t('lgText')}</p>
      <form className="lg-form" onSubmit={submit} noValidate>
        <input className={`input${err ? ' err' : ''}`} value={login} onChange={(e) => { setLogin(e.target.value); setErr(''); }} placeholder={t('lgLogin')} autoCapitalize="none" autoCorrect="off" autoComplete="username" autoFocus />
        <input className={`input${err ? ' err' : ''}`} type="password" value={pass} onChange={(e) => { setPass(e.target.value); setErr(''); }} placeholder={t('lgPass')} autoComplete="current-password" />
        {err && <p className="err-text">{err}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : t('lgBtn')}</button>
      </form>
    </main>
  );
}
