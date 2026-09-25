import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CSS_CLASSES, SORT_OPTIONS } from '~app/constants';
import type { SortOption } from '~app/types';

import SortButton from './SortButton';

describe('SortButton', () => {
  const mockOnSort = vi.fn();
  const sortOption: SortOption = { sortBy: 'points', text: 'points', shortcut: 'P', title: '' };

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

  it.each([
    ['points', 'Sort by points'],
    ['velocity', 'Sort by velocity: fastest-rising posts (points per hour)'],
    ['heat', 'Sort by heat: most-discussed posts (comments per point)'],
    ['default', 'Original sort order'],
  ])('should have a descriptive title for %s sort', (sortBy, title) => {
    const option = SORT_OPTIONS.find((o) => o.sortBy === sortBy)!;
    const { container } = render(<SortButton sortOption={option} activeSort="time" onSort={mockOnSort} />);

    expect(container.querySelector(`.${CSS_CLASSES.BTN}`)?.getAttribute('title')).toBe(title);
  });

  it('should render time sort option correctly', () => {
    const timeOption: SortOption = { sortBy: 'time', text: 'time', shortcut: 'T', title: '' };
    render(<SortButton sortOption={timeOption} activeSort="default" onSort={mockOnSort} />);

    expect(screen.getByText('time')).toBeInTheDocument();
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('should render comments sort option correctly', () => {
    const commentsOption: SortOption = { sortBy: 'comments', text: 'comments', shortcut: 'C', title: '' };
    render(<SortButton sortOption={commentsOption} activeSort="default" onSort={mockOnSort} />);

    expect(screen.getByText('comments')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
  });
});
