import { useEffect, useRef } from 'react';
import { t } from '../lib/i18n.js';

export default function ConfirmDialog({ title, text, confirmLabel, cancelLabel = t('fCancel'), onConfirm, onCancel }) {
  const cancelRef = useRef(null);
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <div
      className="dialog-wrap"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" aria-describedby="dlg-text">
        <h3 id="dlg-title">{title}</h3>
        <p id="dlg-text">{text}</p>
        <div className="dialog-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel} ref={cancelRef}>
            {cancelLabel}
          </button>
          <button type="button" className="btn btn-destructive" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
