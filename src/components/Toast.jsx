export default function Toast({ message }) {
  return (
    <div className="toast-region" aria-live="polite" role="status">
      {message && <div className="toast">{message}</div>}
    </div>
  );
}
