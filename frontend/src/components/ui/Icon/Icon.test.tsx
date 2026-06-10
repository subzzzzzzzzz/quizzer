import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Icon from './Icon';

describe('Icon component', () => {
  it('renders fallback icon paths correctly when SVG registry does not match', () => {
    const { container } = render(<Icon name="warning" size={24} title="warning-icon" />);
    const svgElement = container.querySelector('svg');
    expect(svgElement).toBeInTheDocument();
    expect(svgElement).toHaveAttribute('width', '24');
    expect(svgElement).toHaveAttribute('height', '24');
    
    const titleElement = screen.getByText('warning-icon');
    expect(titleElement).toBeInTheDocument();
  });

  it('renders customized sizes and props correctly', () => {
    const { container } = render(
      <Icon name="trash" size={32} color="red" aria-label="Delete item" className="custom-class" />
    );
    const svgElement = container.querySelector('svg');
    expect(svgElement).toBeInTheDocument();
    expect(svgElement).toHaveAttribute('width', '32');
    expect(svgElement).toHaveAttribute('height', '32');
    expect(svgElement).toHaveAttribute('aria-label', 'Delete item');
    expect(svgElement).toHaveClass('custom-class');
  });

  it('renders fallback paths for check icon', () => {
    const { container } = render(<Icon name="check" />);
    const svgElement = container.querySelector('svg');
    expect(svgElement).toBeInTheDocument();
  });

  it('returns null or handles unknown fallback names gracefully', () => {
    const { container } = render(<Icon name="x-close" />);
    const svgElement = container.querySelector('svg');
    expect(svgElement).toBeInTheDocument();
  });
});
