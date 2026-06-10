import React, { useEffect } from 'react';
import './Modal.scss';
import Icon from '../../atoms/Icon/Icon';
import Button from '../../atoms/Button/Button';

export interface ModalProps {
  title?: React.ReactNode;
  open?: boolean;
  onCancel?: () => void;
  footer?: React.ReactNode[] | null;
  width?: number;
  destroyOnClose?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export const Modal: React.FC<ModalProps> = ({
  title,
  open = false,
  onCancel,
  footer,
  width = 520,
  destroyOnClose = false,
  children,
  style,
}) => {
  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && onCancel) {
      onCancel();
    }
  };

  // Default footer if none is provided and it's not explicitly null
  const renderFooter = () => {
    if (footer === null) return null;
    if (footer) {
      return <div className="modal-footer ant-modal-footer">{footer}</div>;
    }
    return (
      <div className="modal-footer ant-modal-footer">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onCancel}>
          OK
        </Button>
      </div>
    );
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div
        className="modal-container"
        style={{ width: `${width}px`, ...style }}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          {title && <div className="modal-title">{title}</div>}
          {onCancel && (
            <button type="button" aria-label="Close Modal" className="modal-close-btn" onClick={onCancel}>
              <Icon name="x-close" size={16} />
            </button>
          )}
        </div>
        <div className="modal-body">
          {(!destroyOnClose || open) && children}
        </div>
        {renderFooter()}
      </div>
    </div>
  );
};

export default Modal;
