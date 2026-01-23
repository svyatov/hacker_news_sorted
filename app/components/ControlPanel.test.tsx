import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ControlPanel from './ControlPanel';

// Mock the hooks and utilities
vi.mock('~app/hooks/useParsedRows', () => ({
  useParsedRows: () => ({ parsedRows: [], footerRows: [] }),
}));

vi.mock('~app/utils/presenters', () => ({
  updateTable: vi.fn(),
}));

vi.mock('~app/utils/storage', () => ({
  getLastActiveSort: () => 'points',
  setLastActiveSort: vi.fn(),
}));

vi.mock('~app/utils/sorters', () => ({
  sortRows: vi.fn(() => []),
}));

describe('ControlPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all sort buttons', () => {
    render(<ControlPanel />);

    expect(screen.getByText('points')).toBeInTheDocument();
    expect(screen.getByText('time')).toBeInTheDocument();
    expect(screen.getByText('comments')).toBeInTheDocument();
    expect(screen.getByText('default')).toBeInTheDocument();
  });

  it('should render sort by label', () => {
    render(<ControlPanel />);
    expect(screen.getByText('sort by:')).toBeInTheDocument();
  });

  it('should render divider', () => {
    render(<ControlPanel />);
    expect(screen.getByText('|')).toBeInTheDocument();
  });

  it('should render shortcuts for all buttons', () => {
    render(<ControlPanel />);

    expect(screen.getByText('P')).toBeInTheDocument();
    expect(screen.getByText('T')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('should switch active sort when clicking buttons', () => {
    render(<ControlPanel />);

    // Initially points should be active (mocked getLastActiveSort returns 'points')
    const pointsButton = screen.getByText('points').closest('.hns-btn');
    expect(pointsButton?.classList.contains('hns-active')).toBe(true);

    // Click time button
    fireEvent.click(screen.getByText('time'));

    // Time button should now be active
    const timeButton = screen.getByText('time').closest('.hns-btn');
    expect(timeButton?.classList.contains('hns-active')).toBe(true);

    // Points button should no longer be active
    const updatedPointsButton = screen.getByText('points').closest('.hns-btn');
    expect(updatedPointsButton?.classList.contains('hns-active')).toBe(false);
  });

  it('should render separators between buttons', () => {
    const { container } = render(<ControlPanel />);

    // Check that separators are rendered between buttons (3 separators for 4 buttons)
    const text = container.textContent;
    const separatorCount = (text?.match(/·/g) || []).length;
    expect(separatorCount).toBe(3);
  });
});
