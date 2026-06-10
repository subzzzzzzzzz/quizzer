import React from 'react';
import './Card.scss';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  extra?: React.ReactNode;
  children?: React.ReactNode;
  bodyStyle?: React.CSSProperties;
  bordered?: boolean;
}

export const Card: React.FC<CardProps> = ({
  title,
  extra,
  children,
  className = '',
  style,
  bodyStyle,
  bordered = true,
  ...props
}) => {
  return (
    <div
      className={`custom-card ${bordered ? 'custom-card--bordered' : ''} ${className}`}
      style={style}
      {...props}
    >
      {(title || extra) && (
        <div className="custom-card-header">
          {title && <div className="custom-card-title">{title}</div>}
          {extra && <div className="custom-card-extra">{extra}</div>}
        </div>
      )}
      <div className="custom-card-body" style={bodyStyle}>
        {children}
      </div>
    </div>
  );
};

export default Card;
