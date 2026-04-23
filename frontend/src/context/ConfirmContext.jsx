import { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import './ConfirmModal.css';

const ConfirmContext = createContext();

export const useConfirm = () => {
  return useContext(ConfirmContext);
};

export const ConfirmProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [resolver, setResolver] = useState(null);

  const confirm = useCallback((msg) => {
    setMessage(msg);
    setIsOpen(true);
    return new Promise((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const handleConfirm = () => {
    if (resolver) resolver(true);
    setIsOpen(false);
  };

  const handleCancel = () => {
    if (resolver) resolver(false);
    setIsOpen(false);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {isOpen && (
        <div className="modal-overlay confirm-modal-overlay animate-fade-in">
          <div className="modal-content confirm-modal-content">
            <div className="confirm-icon">
              <AlertTriangle size={36} />
            </div>
            <h3>Confirmation Required</h3>
            <p>{message}</p>
            <div className="confirm-actions">
              <button type="button" className="btn-secondary" onClick={handleCancel}>Cancel</button>
              <button type="button" className="btn-primary" onClick={handleConfirm}>Yes, Proceed</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
