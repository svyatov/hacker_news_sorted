import { fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CSS_CLASSES } from '~app/constants';
import type { SortVariant } from '~app/types';
import { correctAgeTexts, restoreAgeTexts } from '~app/utils/presenters';

import ControlPanel from './ControlPanel';

// Mock the hooks and utilities
vi.mock('~app/hooks/useParsedRows', () => ({
  useParsedRows: () => ({ parsedRows: [], footerRows: [] }),
}));

vi.mock('~app/utils/presenters', () => ({
  updateTable: vi.fn(),
  correctAgeTexts: vi.fn(),
  restoreAgeTexts: vi.fn(),
}));

let mockShowTrueTimeAgo = true;

vi.mock('~app/hooks/useSettings', () => ({
  useSettings: () => {
    const [activeSort, setActiveSort] = useState<SortVariant>('points');
    return { activeSort, setActiveSort, showTrueTimeAgo: mockShowTrueTimeAgo };
  },
}));

vi.mock('~app/utils/sorters', () => ({
  sortRows: vi.fn(() => []),
}));

const mockIncrementSortCount = vi.fn();
const mockDismissPrompt = vi.fn();

vi.mock('~app/hooks/useReviewPrompt', () => ({
  useReviewPrompt: () => ({
    showPrompt: true,
    dismissPrompt: mockDismissPrompt,
    incrementSortCount: mockIncrementSortCount,
  }),
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
    const pointsButton = screen.getByText('points').closest(`.${CSS_CLASSES.BTN}`);
    expect(pointsButton?.classList.contains(CSS_CLASSES.ACTIVE)).toBe(true);

    // Click time button
    fireEvent.click(screen.getByText('time'));

    // Time button should now be active
    const timeButton = screen.getByText('time').closest(`.${CSS_CLASSES.BTN}`);
    expect(timeButton?.classList.contains(CSS_CLASSES.ACTIVE)).toBe(true);

    // Points button should no longer be active
    const updatedPointsButton = screen.getByText('points').closest(`.${CSS_CLASSES.BTN}`);
    expect(updatedPointsButton?.classList.contains(CSS_CLASSES.ACTIVE)).toBe(false);
  });

  it('should render separators between buttons', () => {
    const { container } = render(<ControlPanel />);

    // Check that separators are rendered between buttons (3 separators for 4 buttons)
    const text = container.textContent;
    const separatorCount = (text?.match(/·/g) || []).length;
    expect(separatorCount).toBe(3);
  });

  it('should call incrementSortCount when switching sort', () => {
    render(<ControlPanel />);

    fireEvent.click(screen.getByText('time'));
    expect(mockIncrementSortCount).toHaveBeenCalledOnce();
  });

  it('should not call incrementSortCount when clicking active sort', () => {
    render(<ControlPanel />);

    fireEvent.click(screen.getByText('points'));
    expect(mockIncrementSortCount).not.toHaveBeenCalled();
  });

  it('should render review toast when showPrompt is true', () => {
    render(<ControlPanel />);

    expect(screen.getByText(/Leave a review/)).toBeInTheDocument();
    expect(screen.getByLabelText('Dismiss')).toBeInTheDocument();
  });

  it('should call dismissPrompt when clicking dismiss button', () => {
    render(<ControlPanel />);

    fireEvent.click(screen.getByLabelText('Dismiss'));
    expect(mockDismissPrompt).toHaveBeenCalledOnce();
  });

  it('should call restoreAgeTexts when showTrueTimeAgo is false', () => {
    mockShowTrueTimeAgo = false;
    render(<ControlPanel />);
    expect(restoreAgeTexts).toHaveBeenCalled();
    mockShowTrueTimeAgo = true;
  });

  it('should call correctAgeTexts when showTrueTimeAgo is true', () => {
    render(<ControlPanel />);
    expect(correctAgeTexts).toHaveBeenCalled();
  });
});
