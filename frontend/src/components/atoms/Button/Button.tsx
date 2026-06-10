import React from 'react';
import './Button.scss';
import Spinner from '../Spinner/Spinner';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'text' | 'link';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  block?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  loading = false,
  block = false,
  className = '',
  disabled,
  ...props
}) => {
  const buttonClass = [
    'custom-btn',
    `custom-btn--${variant}`,
    variant === 'primary' ? 'ant-btn-primary' : '',
    `custom-btn--${size}`,
    block ? 'custom-btn--block' : '',
    loading ? 'custom-btn--loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={buttonClass}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size="small" className="btn-spinner" />}
      <span className="btn-content">{children}</span>
    </button>
  );
};

export default Button;
