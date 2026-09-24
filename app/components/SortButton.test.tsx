import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CSS_CLASSES } from '~app/constants';
import type { SortOption } from '~app/types';

import SortButton from './SortButton';

describe('SortButton', () => {
  const mockOnSort = vi.fn();
  const sortOption: SortOption = { sortBy: 'points', text: 'points', shortcut: 'P' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render button with text and shortcut', () => {
    render(<SortButton sortOption={sortOption} activeSort="default" onSort={mockOnSort} />);

    expect(screen.getByText('points')).toBeInTheDocument();
    expect(screen.getByText('P')).toBeInTheDocument();
  });

  it('should call onSort when clicked and not active', () => {
    render(<SortButton sortOption={sortOption} activeSort="default" onSort={mockOnSort} />);

    fireEvent.click(screen.getByText('points'));
    expect(mockOnSort).toHaveBeenCalledWith('points');
  });

  it('should not call onSort when already active', () => {
    render(<SortButton sortOption={sortOption} activeSort="points" onSort={mockOnSort} />);

    fireEvent.click(screen.getByText('points'));
    expect(mockOnSort).not.toHaveBeenCalled();
  });

  it('should apply active class when active', () => {
    const { container } = render(<SortButton sortOption={sortOption} activeSort="points" onSort={mockOnSort} />);

    expect(container.querySelector(`.${CSS_CLASSES.ACTIVE}`)).toBeInTheDocument();
  });

  it('should not apply active class when not active', () => {
    const { container } = render(<SortButton sortOption={sortOption} activeSort="default" onSort={mockOnSort} />);

    expect(container.querySelector(`.${CSS_CLASSES.ACTIVE}`)).not.toBeInTheDocument();
  });

  it('should have correct title for non-default sort', () => {
    const { container } = render(<SortButton sortOption={sortOption} activeSort="default" onSort={mockOnSort} />);

    const button = container.querySelector(`.${CSS_CLASSES.BTN}`);
    expect(button?.getAttribute('title')).toBe('Sort by points');
  });

  it('should have correct title for default sort', () => {
    const defaultOption: SortOption = { sortBy: 'default', text: 'default', shortcut: 'D' };
    const { container } = render(<SortButton sortOption={defaultOption} activeSort="points" onSort={mockOnSort} />);

    const button = container.querySelector(`.${CSS_CLASSES.BTN}`);
    expect(button?.getAttribute('title')).toBe('Original sort order');
  });

  it('should render time sort option correctly', () => {
    const timeOption: SortOption = { sortBy: 'time', text: 'time', shortcut: 'T' };
    render(<SortButton sortOption={timeOption} activeSort="default" onSort={mockOnSort} />);

    expect(screen.getByText('time')).toBeInTheDocument();
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('should render comments sort option correctly', () => {
    const commentsOption: SortOption = { sortBy: 'comments', text: 'comments', shortcut: 'C' };
    render(<SortButton sortOption={commentsOption} activeSort="default" onSort={mockOnSort} />);

    expect(screen.getByText('comments')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
  });
});
