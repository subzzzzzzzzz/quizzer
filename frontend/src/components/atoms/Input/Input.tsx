import React, { useState, forwardRef } from 'react';
import './Input.scss';
import Icon from '../Icon/Icon';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  size?: 'small' | 'medium' | 'large';
  prefix?: React.ReactNode;
}

export const BaseInput = forwardRef<HTMLInputElement, InputProps>(({
  size = 'medium',
  prefix,
  className = '',
  type = 'text',
  disabled,
  ...props
}, ref) => {
  const containerClass = [
    'input-container',
    `input-container--${size}`,
    disabled ? 'input-container--disabled' : '',
    prefix ? 'input-container--has-prefix' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClass}>
      {prefix && <span className="input-prefix">{prefix}</span>}
      <input
        ref={ref}
        type={type}
        disabled={disabled}
        className="custom-input"
        {...props}
      />
    </div>
  );
});

// Input.Password component
export type PasswordProps = Omit<InputProps, 'type' | 'prefix'>;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordProps>(({
  size = 'medium',
  className = '',
  disabled,
  ...props
}, ref) => {
  const [visible, setVisible] = useState(false);

  const containerClass = [
    'input-container',
    `input-container--${size}`,
    disabled ? 'input-container--disabled' : '',
    'input-container--has-suffix',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClass}>
      <input
        ref={ref}
        type={visible ? 'text' : 'password'}
        disabled={disabled}
        className="custom-input"
        {...props}
      />
      <button
        type="button"
        className="input-suffix-btn"
        onClick={() => setVisible(!visible)}
        disabled={disabled}
        tabIndex={-1}
      >
        <Icon name={visible ? 'eye' : 'lock'} size={16} />
      </button>
    </div>
  );
});

// Input.TextArea component
export interface TextAreaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  size?: 'small' | 'medium' | 'large';
}

export const TextAreaInput = forwardRef<HTMLTextAreaElement, TextAreaProps>(({
  size = 'medium',
  className = '',
  disabled,
  ...props
}, ref) => {
  const containerClass = [
    'input-container-textarea',
    `input-container-textarea--${size}`,
    disabled ? 'input-container-textarea--disabled' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClass}>
      <textarea
        ref={ref}
        disabled={disabled}
        className="custom-textarea"
        {...props}
      />
    </div>
  );
});

// Composition pattern to support Input.Password and Input.TextArea
interface InputComponentType extends React.ForwardRefExoticComponent<InputProps & React.RefAttributes<HTMLInputElement>> {
  Password: typeof PasswordInput;
  TextArea: typeof TextAreaInput;
}

export const Input = BaseInput as unknown as InputComponentType;
Input.Password = PasswordInput;
Input.TextArea = TextAreaInput;

export default Input;
