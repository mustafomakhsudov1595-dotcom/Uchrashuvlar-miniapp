import { t } from '../lib/i18n.js';

// Hisobga kirilmagan: ilova ishlamaydi, botda login/parol bilan kirish kerak
export default function LoginGate() {
  const close = () => { try { window.Telegram?.WebApp?.close(); } catch { /* ignore */ } };
  return (
    <main className="login-gate">
      <div className="lg-ico">🔐</div>
      <h1>{t('lgTitle')}</h1>
      <p>{t('lgText')}</p>
      <button type="button" className="btn btn-primary" onClick={close}>{t('lgBtn')}</button>
    </main>
  );
}
