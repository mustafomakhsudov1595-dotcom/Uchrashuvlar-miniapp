export default function Toast({ toast }) {
  return (
    <div className="toast-region" aria-live="polite" role="status">
      {toast && (
        <div className="toast">
          <span>{toast.message}</span>
          {toast.action && (
            <button type="button" onClick={toast.action.fn}>
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
