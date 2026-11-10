import { useEffect, useState } from 'react';
import Sheet from './Sheet.jsx';
import { openTelegramLink } from '../lib/telegram.js';
import { t } from '../lib/i18n.js';

const LANGS = [['uz', '🇺🇿'], ['ru', '🇷🇺'], ['en', '🇬🇧']];

export default function MessageSheet({ title, kinds, onBuild, onClose }) {
  const [kind, setKind] = useState(kinds[0]);
  const [lang, setLang] = useState('uz');
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    setBusy(true);
    setCopied(false);
    onBuild(kind, lang)
      .then((r) => live && setRes(r))
      .catch(() => live && setRes({ error: true }))
      .finally(() => live && setBusy(false));
    return () => {
      live = false;
    };
  }, [kind, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(res.text);
      setCopied(true);
    } catch {
      /* ignore */
    }
  };

  return (
    <Sheet title={t('msgTitle')} onClose={onClose} tall>
      <p className="msg-for">{title}</p>
      <div className="cat-chips wrap" role="group">
        {kinds.map((k) => (
          <button type="button" key={k} className={`cat-chip${kind === k ? ' on' : ''}`} onClick={() => setKind(k)}>{t('msgKinds')[k]}</button>
        ))}
      </div>
      <div className="section-title"><h4>{t('msgLang')}</h4></div>
      <div className="cat-chips" role="group">
        {LANGS.map(([l, flag]) => (
          <button type="button" key={l} className={`cat-chip${lang === l ? ' on' : ''}`} onClick={() => setLang(l)}>{flag} {l.toUpperCase()}</button>
        ))}
      </div>
      <div className="prompt-box" style={{ marginTop: 16 }}>
        {busy && <p className="muted">…</p>}
        {!busy && res && res.empty && <p className="muted">{t('msgNoOwed')}</p>}
        {!busy && res && res.error && <p className="err-text">{t('svSeoFail')}</p>}
        {!busy && res && res.text && (
          <>
            <textarea className="input" readOnly rows={8} value={res.text} onFocus={(e) => e.target.select()} />
            <button type="button" className="btn btn-primary bot-btn" onClick={copy}>{copied ? `✓ ${t('svCopied')}` : t('svCopy')}</button>
            <button type="button" className="btn btn-ghost bot-btn" onClick={() => openTelegramLink(`https://t.me/share/url?url=%20&text=${encodeURIComponent(res.text)}`)}>✈️ {t('msgSend')}</button>
            {res.phone && <button type="button" className="btn btn-ghost bot-btn" onClick={() => openTelegramLink(res.phone)}>👤 {t('msgWrite')}</button>}
          </>
        )}
      </div>
    </Sheet>
  );
}
