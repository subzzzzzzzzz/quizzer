import React, { useEffect } from 'react';
import './Drawer.scss';
import Icon from '../../atoms/Icon/Icon';

export interface DrawerProps {
  title?: React.ReactNode;
  open?: boolean;
  onClose?: () => void;
  width?: number | string;
  destroyOnClose?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export const Drawer: React.FC<DrawerProps> = ({
  title,
  open = false,
  onClose,
  width = 378,
  destroyOnClose = false,
  children,
  style,
}) => {
  // Prevent body scroll when drawer is open
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
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  const drawerWidth = typeof width === 'number' ? `${width}px` : width;

  return (
    <div className="drawer-backdrop" onClick={handleBackdropClick}>
      <div
        className="drawer-container"
        style={{ width: drawerWidth, ...style }}
        role="dialog"
        aria-modal="true"
      >
        <div className="drawer-header">
          {title && <div className="drawer-title">{title}</div>}
          {onClose && (
            <button type="button" className="drawer-close-btn" onClick={onClose}>
              <Icon name="x-close" size={16} />
            </button>
          )}
        </div>
        <div className="drawer-body">
          {(!destroyOnClose || open) && children}
        </div>
      </div>
    </div>
  );
};

export default Drawer;
