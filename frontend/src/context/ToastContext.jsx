import React, { createContext, useContext, useState, useEffect } from 'react';
import { ToastContainer } from '../components/Toast';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Register window.showToast as a convenience fallback
  useEffect(() => {
    window.showToast = showToast;
    return () => {
      window.showToast = null;
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, addToast: showToast }}>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  return context || { 
    showToast: (msg, type) => window.showToast?.(msg, type),
    addToast: (msg, type) => window.showToast?.(msg, type)
  };
}
