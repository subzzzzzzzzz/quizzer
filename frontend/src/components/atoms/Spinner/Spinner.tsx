import React from 'react';
import './Spinner.scss';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'small' | 'medium' | 'large';
  tip?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'medium',
  className = '',
  style,
  tip,
  ...props
}) => {
  return (
    <div className={`spinner-wrapper ${className}`} style={style} {...props}>
      <div className={`spinner spinner--${size}`} />
      {tip && <span className="spinner-tip">{tip}</span>}
    </div>
  );
};

export default Spinner;
