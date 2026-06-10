import React from 'react';
import './Checkbox.scss';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e.target.checked);
    }
  };

  const containerClass = [
    'checkbox-label-wrapper',
    disabled ? 'checkbox-label-wrapper--disabled' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <label className={containerClass}>
      <span className="checkbox-input-container">
        <input
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          className="custom-checkbox-input"
          {...props}
        />
        <span className={`custom-checkbox-indicator ${checked ? 'custom-checkbox-indicator--checked' : ''}`}>
          {checked && (
            <svg viewBox="0 0 24 24" className="checkbox-checkmark" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </span>
      </span>
      {children && <span className="checkbox-text-content">{children}</span>}
    </label>
  );
};

export default Checkbox;
