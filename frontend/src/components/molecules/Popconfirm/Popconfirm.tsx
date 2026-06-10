import React, { useState, useRef, useEffect } from 'react';
import './Popconfirm.scss';
import Button from '../../atoms/Button/Button';

export interface PopconfirmProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  onConfirm: () => void;
  onCancel?: () => void;
  okText?: string;
  cancelText?: string;
  children: React.ReactElement;
  okButtonProps?: { loading?: boolean; danger?: boolean };
}

export const Popconfirm: React.FC<PopconfirmProps> = ({
  title,
  description,
  onConfirm,
  onCancel,
  okText = 'Yes',
  cancelText = 'No',
  children,
  okButtonProps,
}) => {
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setVisible(false);
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [visible]);

  const handleConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConfirm();
    setVisible(false);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCancel) onCancel();
    setVisible(false);
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisible(!visible);
  };

  return (
    <div className="popconfirm-wrapper" ref={containerRef}>
      {React.cloneElement(children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>, {
        onClick: (e: React.MouseEvent) => {
          handleTriggerClick(e);
          const childProps = children.props as { onClick?: (e: React.MouseEvent) => void };
          if (childProps.onClick) childProps.onClick(e);
        },
      })}

      {visible && (
        <div className="popconfirm-popover">
          <div className="popconfirm-content">
            <div className="popconfirm-title">{title}</div>
            {description && <div className="popconfirm-description">{description}</div>}
          </div>
          <div className="popconfirm-actions">
            <Button size="small" variant="text" onClick={handleCancel}>
              {cancelText}
            </Button>
            <Button
              size="small"
              variant={okButtonProps?.danger ? 'danger' : 'primary'}
              loading={okButtonProps?.loading}
              onClick={handleConfirm}
            >
              {okText}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Popconfirm;
