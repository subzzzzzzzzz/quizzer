import React, { useState } from 'react';
import './Alert.scss';
import Icon from '../Icon/Icon';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: 'success' | 'info' | 'warning' | 'error';
  message: React.ReactNode;
  description?: React.ReactNode;
  showIcon?: boolean;
  closable?: boolean;
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  message,
  description,
  showIcon = false,
  closable = false,
  onClose,
  style,
  className = '',
  ...props
}) => {
  const [closed, setClosed] = useState(false);

  if (closed) return null;

  const handleClose = () => {
    setClosed(true);
    if (onClose) {
      onClose();
    }
  };

  const getIconName = () => {
    switch (type) {
      case 'success':
        return 'check-circle';
      case 'warning':
        return 'alert-triangle';
      case 'error':
        return 'alert-cancel';
      default:
        return 'help-circle';
    }
  };

  return (
    <div className={`custom-alert custom-alert--${type} ${description ? 'custom-alert--with-desc' : ''} ${className}`} style={style} {...props}>
      {showIcon && (
        <span className="alert-icon-container">
          <Icon name={getIconName()} size={description ? 20 : 16} />
        </span>
      )}
      <div className="alert-content">
        <span className="alert-message">{message}</span>
        {description && <div className="alert-description">{description}</div>}
      </div>
      {closable && (
        <button type="button" className="alert-close-btn" onClick={handleClose}>
          <Icon name="x-close" size={14} />
        </button>
      )}
    </div>
  );
};

export default Alert;
