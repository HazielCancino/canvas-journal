import { useState, useEffect } from 'react';
import './Toast.css';

let toastTimeout;
let notifySubscribers = [];

export const notify = (message, type = 'success', duration = 3000) => {
  notifySubscribers.forEach(sub => sub(message, type, duration));
};

export default function ToastProvider() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const handleNotify = (message, type, duration) => {
      setToast({ message, type });
      clearTimeout(toastTimeout);
      if (duration > 0) {
        toastTimeout = setTimeout(() => setToast(null), duration);
      }
    };
    notifySubscribers.push(handleNotify);
    return () => {
      notifySubscribers = notifySubscribers.filter(sub => sub !== handleNotify);
      clearTimeout(toastTimeout);
    };
  }, []);

  if (!toast) return null;

  return (
    <div className={`toast toast-${toast.type} toast-enter`}>
      <span className="toast-icon">
        {toast.type === 'success' ? '✓' : toast.type === 'error' ? '⚠️' : 'ℹ️'}
      </span>
      <span className="toast-message">{toast.message}</span>
      <button className="toast-close" onClick={() => setToast(null)}>✕</button>
    </div>
  );
}
