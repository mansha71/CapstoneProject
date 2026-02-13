import { X } from 'lucide-react';

const InfoModal = ({ isOpen, title, ariaLabel, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="metrics-info-modal-backdrop" onClick={onClose}>
      <div
        className="metrics-info-modal"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="metrics-info-modal-header">
          <h3>{title}</h3>
          <button
            type="button"
            className="metrics-info-close-btn"
            aria-label="Close info modal"
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="metrics-info-list">{children}</div>
      </div>
    </div>
  );
};

export default InfoModal;

