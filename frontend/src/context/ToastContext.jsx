import React, { createContext, useContext, useState, useCallback } from 'react';

const toastCss = `/* Container fixed to the top-left of the viewport */
.toast-container-left {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
}

/* Base Toast Popup */
.toast-popup {
  pointer-events: auto;
  min-width: 300px;
  max-width: 420px;
  padding: 14px 18px;
  border-radius: 10px;
  color: #ffffff;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  cursor: pointer;

  /* Slide in from left, then fade out right before 5s */
  animation: slideInLeft 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards,
             fadeOutLeft 0.5s ease 4.5s forwards;
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toast-icon {
  font-size: 16px;
}

.toast-message {
  line-height: 1.4;
}

/* Gradient Backgrounds */
.toast-popup.error {
  background: linear-gradient(135deg, #eb3941 0%, #f15e64 100%);
  border-left: 5px solid #900C3F;
}

.toast-popup.success {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  border-left: 5px solid #056334;
}

.toast-popup.warning {
  background: linear-gradient(135deg, #ff9900 0%, #ff5500 100%);
  border-left: 5px solid #a33600;
}

.toast-popup.info {
  background: linear-gradient(135deg, #1d976c 0%, #93f9b9 100%);
  border-left: 5px solid #0f5238;
}

/* Left-to-Right Entrance Animation */
@keyframes slideInLeft {
  0% {
    opacity: 0;
    transform: translateX(-110%);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Exit Fade-out Animation before disappearing */
@keyframes fadeOutLeft {
  0% {
    opacity: 1;
    transform: translateX(0);
  }
  100% {
    opacity: 0;
    transform: translateX(-30px);
  }
}`;

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();

    setToasts((prev) => [...prev, { id, message, type }]);

    // Automatically remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <style>{toastCss}</style>

      {/* Toast Container positioned at top-left */}
      <div className="toast-container-left">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast-popup ${toast.type}`}
            onClick={() => removeToast(toast.id)}
          >
            <div className="toast-content">
              <span className="toast-icon">
                {toast.type === 'error' && '⚠️'}
                {toast.type === 'success' && '✅'}
                {toast.type === 'warning' && '⚡'}
                {toast.type === 'info' && 'ℹ️'}
              </span>
              <span className="toast-message">{toast.message}</span>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};