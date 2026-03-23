import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DivergenceBadge, DifficultyBadge } from '../DivergenceBadge';

describe('DivergenceBadge', () => {
  it('renders nothing when signal is undefined', () => {
    const { container } = render(<DivergenceBadge signal={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders gray badge', () => {
    render(<DivergenceBadge signal="gray" />);
    expect(screen.getByText('Gray')).toBeInTheDocument();
  });

  it('renders yellow badge', () => {
    render(<DivergenceBadge signal="yellow" />);
    expect(screen.getByText('Yellow')).toBeInTheDocument();
  });

  it('renders signal badge', () => {
    render(<DivergenceBadge signal="signal" />);
    expect(screen.getByText('Signal')).toBeInTheDocument();
  });

  it('shows difficulty as secondary indicator when provided', () => {
    render(<DivergenceBadge signal="yellow" difficulty="depth" />);
    expect(screen.getByText('Yellow')).toBeInTheDocument();
    expect(screen.getByText('Depth')).toBeInTheDocument();
  });

  it('does not show difficulty when signal is undefined', () => {
    const { container } = render(<DivergenceBadge signal={undefined} difficulty="breadth" />);
    expect(container.firstChild).toBeNull();
  });

  it('applies custom className', () => {
    render(<DivergenceBadge signal="gray" className="custom-class" />);
    expect(screen.getByText('Gray').closest('span')).toHaveClass('custom-class');
  });
});

describe('DifficultyBadge', () => {
  it('renders breadth badge with blue styling', () => {
    render(<DifficultyBadge difficulty="breadth" />);
    const badge = screen.getByText('Breadth');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-blue-100', 'text-blue-700');
  });

  it('renders depth badge with purple styling', () => {
    render(<DifficultyBadge difficulty="depth" />);
    const badge = screen.getByText('Depth');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-purple-100', 'text-purple-700');
  });

  it('renders constrained badge with orange styling', () => {
    render(<DifficultyBadge difficulty="constrained" />);
    const badge = screen.getByText('Constrained');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-orange-100', 'text-orange-700');
  });

  it('applies custom className', () => {
    render(<DifficultyBadge difficulty="breadth" className="extra" />);
    expect(screen.getByText('Breadth')).toHaveClass('extra');
  });
});
