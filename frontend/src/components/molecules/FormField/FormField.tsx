import React, { useId } from 'react';
import './FormField.scss';

export interface FormFieldProps {
  label?: React.ReactNode;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  htmlFor?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  required = false,
  children,
  className = '',
  style,
  htmlFor,
}) => {
  const generatedId = useId();
  const id = htmlFor || generatedId;

  // Clone children to automatically inject the id to the input components
  const renderedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      const typedChild = child as React.ReactElement<{ id?: string }>;
      return React.cloneElement(typedChild, {
        id: typedChild.props.id || id,
      });
    }
    return child;
  });

  return (
    <div className={`form-field ${error ? 'form-field--error' : ''} ${className}`} style={style}>
      {label && (
        <div className="form-field-label-container" style={{ display: 'inline-flex', alignItems: 'center' }}>
          <label className="form-field-label" htmlFor={id}>
            {label}
          </label>
          {required && <span className="form-field-required" style={{ color: 'var(--danger-2)', marginLeft: '3px', fontWeight: 'bold' }}>*</span>}
        </div>
      )}
      <div className="form-field-control">{renderedChildren}</div>
      {error && <div className="form-field-error-msg">{error}</div>}
    </div>
  );
};

export default FormField;
