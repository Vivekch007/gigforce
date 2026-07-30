import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

/**
 * Global ConfirmationContext — replaces window.confirm() with a styled modal.
 *
 * Usage:
 *   const { showConfirmation } = useConfirmation();
 *   const confirmed = await showConfirmation({ title: '...', message: '...' });
 *   if (confirmed) { ... }
 */

const ConfirmationContext = createContext(null);

export function ConfirmationProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolveRef = useRef(null);

  const showConfirmation = useCallback(({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'danger' }) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialog({ title, message, confirmLabel, cancelLabel, variant });
    });
  }, []);

  const handleConfirm = () => {
    setDialog(null);
    resolveRef.current?.(true);
  };

  const handleCancel = () => {
    setDialog(null);
    resolveRef.current?.(false);
  };

  return (
    <ConfirmationContext.Provider value={{ showConfirmation }}>
      {children}
      {dialog && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10000 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '420px' }}>
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              {/* Header */}
              <div
                className="modal-header border-0 pb-2 pt-4 px-4"
                style={{
                  background: dialog.variant === 'danger'
                    ? 'linear-gradient(135deg, #fff5f5 0%, #fff 100%)'
                    : 'linear-gradient(135deg, #f0f9ff 0%, #fff 100%)',
                }}
              >
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                      width: 40,
                      height: 40,
                      background: dialog.variant === 'danger' ? '#FEE2E2' : '#DBEAFE',
                    }}
                  >
                    <i
                      className={`bi ${dialog.variant === 'danger' ? 'bi-exclamation-triangle-fill text-danger' : 'bi-question-circle-fill text-primary'}`}
                      style={{ fontSize: '1.1rem' }}
                    />
                  </div>
                  <h6 className="modal-title fw-bold text-dark mb-0" id="confirm-modal-title">
                    {dialog.title}
                  </h6>
                </div>
              </div>

              {/* Body */}
              <div className="modal-body px-4 py-3">
                <p className="text-muted small mb-0" style={{ lineHeight: 1.6 }}>
                  {dialog.message}
                </p>
              </div>

              {/* Footer */}
              <div className="modal-footer border-0 px-4 pb-4 pt-2 gap-2">
                <button
                  type="button"
                  id="confirm-modal-cancel-btn"
                  className="btn-enterprise-secondary px-4"
                  onClick={handleCancel}
                >
                  {dialog.cancelLabel}
                </button>
                <button
                  type="button"
                  id="confirm-modal-confirm-btn"
                  className={`btn px-4 fw-semibold ${dialog.variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
                  style={{ borderRadius: '8px', fontSize: '0.875rem' }}
                  onClick={handleConfirm}
                >
                  {dialog.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmationContext.Provider>
  );
}

export function useConfirmation() {
  const ctx = useContext(ConfirmationContext);
  if (!ctx) {
    // Graceful fallback when used outside the provider (e.g. tests)
    return {
      showConfirmation: ({ message }) => Promise.resolve(window.confirm(message)),
    };
  }
  return ctx;
}
