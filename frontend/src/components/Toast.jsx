import React, { useEffect } from 'react';

export function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    if (type === 'success') return 'bi-check-circle-fill text-success';
    if (type === 'error') return 'bi-x-circle-fill text-danger';
    if (type === 'success') return 'bi-check-circle-fill text-white';
    if (type === 'error') return 'bi-x-circle-fill text-white';
    if (type === 'warning') return 'bi-exclamation-circle-fill text-dark';
    return 'bi-info-circle-fill text-white';
  };

  return (
    <div
      className={`toast show align-items-center border-0 shadow-sm p-3 rounded-3 ${
        type === 'success' ? 'bg-success text-white' : 
        type === 'error' ? 'bg-danger text-white' : 
        type === 'warning' ? 'bg-warning text-dark' : 'bg-primary text-white'
      }`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      style={{
        minWidth: '320px',
        transition: 'all 0.2s ease-in-out',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}
    >
      <div className="d-flex align-items-center gap-3">
        <i className={`bi ${getIcon()} fs-5`}></i>
        <div className="toast-body small fw-medium p-0" style={{ color: 'inherit' }}>{message}</div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className={`btn-close ms-2 ${type === 'warning' ? '' : 'btn-close-white'}`}
        aria-label="Close"
        style={{ fontSize: '10px', boxShadow: 'none' }}
      ></button>
    </div>
  );
}

export function ToastContainer({ toasts, removeToast }) {
  return (
    <div
      className="position-fixed top-0 end-0 p-3"
      style={{
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'none',
        marginTop: '60px' // Starts below topbar
      }}
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
