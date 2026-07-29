import React, { useEffect } from 'react';

export function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    if (type === 'success') return 'bi-check-circle-fill text-success';
    if (type === 'error') return 'bi-x-circle-fill text-danger';
    if (type === 'warning') return 'bi-exclamation-circle-fill text-warning';
    return 'bi-info-circle-fill text-info';
  };

  return (
    <div 
      className="toast show align-items-center border-0 bg-white shadow-sm p-3 rounded-3"
      role="alert" 
      aria-live="assertive" 
      aria-atomic="true"
      style={{
        minWidth: '320px',
        borderLeft: `4px solid ${
          type === 'success' ? '#166534' : 
          type === 'error' ? '#B42318' : 
          type === 'warning' ? '#9A6700' : '#2563EB'
        }`,
        transition: 'all 0.2s ease-in-out',
        display: 'flex',
        justifyContent: 'space-between',
        pointerEvents: 'auto',
        animation: 'toastFadeIn 0.25s ease-out'
      }}
    >
      <div className="d-flex align-items-center gap-3 flex-grow-1">
        <i className={`bi ${getIcon()} fs-5`}></i>
        <div className="toast-body small fw-medium text-dark p-0">{message}</div>
      </div>
      <button 
        type="button" 
        onClick={onClose} 
        className="btn-close ms-2" 
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
