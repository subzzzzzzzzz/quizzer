import React from 'react';
import './Tag.scss';

export interface TagProps {
  color?: 'success' | 'processing' | 'warning' | 'error' | 'default';
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const Tag: React.FC<TagProps> = ({
  color = 'default',
  children,
  style,
}) => {
  return (
    <span className={`custom-tag custom-tag--${color}`} style={style}>
      {children}
    </span>
  );
};

export default Tag;
