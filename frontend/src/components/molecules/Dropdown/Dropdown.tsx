import React, { useState, useRef, useEffect } from 'react';
import './Dropdown.scss';

export interface DropdownMenuItem {
  key: string;
  label: React.ReactNode;
  danger?: boolean;
  icon?: React.ReactNode;
}

export interface DropdownProps {
  menu: {
    items: DropdownMenuItem[];
    onClick?: (event: { key: string }) => void;
  };
  trigger?: ('click' | 'hover')[];
  children: React.ReactElement;
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  menu,
  trigger = ['click'],
  children,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const handleTriggerClick = (e: React.MouseEvent) => {
    if (trigger.includes('click')) {
      e.stopPropagation();
      setIsOpen(!isOpen);
    }
  };

  const handleMouseEnter = () => {
    if (trigger.includes('hover')) {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (trigger.includes('hover')) {
      setIsOpen(false);
    }
  };

  const handleItemClick = (key: string) => {
    setIsOpen(false);
    if (menu.onClick) {
      menu.onClick({ key });
    }
  };

  return (
    <div
      className={`dropdown-wrapper ${className}`}
      ref={dropdownRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {React.cloneElement(children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>, {
        onClick: (e: React.MouseEvent) => {
          handleTriggerClick(e);
          const childProps = children.props as { onClick?: (e: React.MouseEvent) => void };
          if (childProps.onClick) childProps.onClick(e);
        },
      })}

      {isOpen && (
        <div className="dropdown-overlay">
          <ul className="dropdown-menu">
            {menu.items.map((item) => (
              <li
                key={item.key}
                className={`dropdown-item ${item.danger ? 'dropdown-item--danger' : ''}`}
                onClick={() => handleItemClick(item.key)}
              >
                {item.icon && <span className="dropdown-item-icon">{item.icon}</span>}
                <span className="dropdown-item-label">{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Dropdown;
