import { act, fireEvent, render, screen, within } from '@testing-library/react';
import React, { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CONTROL_PANEL_ROOT_ID, CSS_CLASSES, SORT_COUNT_ATTR, SORT_OPTIONS } from '~app/constants';
import type { SortVariant } from '~app/types';
import { correctAgeTexts, restoreAgeTexts } from '~app/utils/presenters';

import ControlPanel from './ControlPanel';

// Option subsets by enabled count
const ALL_OPTIONS = SORT_OPTIONS; // 6
const NO_DERIVED = SORT_OPTIONS.filter((o) => o.sortBy !== 'velocity' && o.sortBy !== 'heat'); // 4
const VELOCITY_ONLY = SORT_OPTIONS.filter((o) => o.sortBy !== 'heat'); // 5

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
let mockEnabledSortOptions = ALL_OPTIONS;
let mockSettled = true;

vi.mock('~app/hooks/useSettings', () => ({
  useSettings: () => {
    const [activeSort, setActiveSort] = useState<SortVariant>('points');
    return {
      activeSort,
      setActiveSort,
      showTrueTimeAgo: mockShowTrueTimeAgo,
      enabledSortOptions: mockEnabledSortOptions,
      settled: mockSettled,
    };
  },
}));

let mockConflictKeys = new Set<string>();
let capturedKbConfig: { onSort: (sort: SortVariant) => void; enabledSortOptions?: unknown } | undefined;
vi.mock('~app/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: (config: { onSort: (sort: SortVariant) => void; enabledSortOptions?: unknown }) => {
    capturedKbConfig = config;
    return mockConflictKeys;
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

const getButtonsTier = (container: HTMLElement) =>
  container.querySelector(`.${CSS_CLASSES.BUTTONS_TIER}`) as HTMLElement;

describe('ControlPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.replaceChildren();
    mockShowTrueTimeAgo = true;
    mockEnabledSortOptions = ALL_OPTIONS;
    mockSettled = true;
    mockConflictKeys = new Set();
    capturedKbConfig = undefined;
  });

  it('passes the live enabled options through to the keyboard shortcuts hook (AE3 wiring)', () => {
    const { rerender } = render(<ControlPanel />);
    expect(capturedKbConfig?.enabledSortOptions).toBe(ALL_OPTIONS);

    mockEnabledSortOptions = NO_DERIVED;
    rerender(<ControlPanel />);
    expect(capturedKbConfig?.enabledSortOptions).toBe(NO_DERIVED);
  });

  it('ignores a sort request for the already-active sort (no-op guard)', () => {
    render(<ControlPanel />); // active sort starts at 'points'
    act(() => capturedKbConfig!.onSort('points'));
    expect(mockIncrementSortCount).not.toHaveBeenCalled();

    act(() => capturedKbConfig!.onSort('time'));
    expect(mockIncrementSortCount).toHaveBeenCalledOnce();
  });

  it('renders a button per enabled option: 6 / 4 / 5', () => {
    const { container, rerender } = render(<ControlPanel />);
    expect(getButtonsTier(container).querySelectorAll(`.${CSS_CLASSES.BTN}`)).toHaveLength(6);

    mockEnabledSortOptions = NO_DERIVED;
    rerender(<ControlPanel />);
    expect(getButtonsTier(container).querySelectorAll(`.${CSS_CLASSES.BTN}`)).toHaveLength(4);

    mockEnabledSortOptions = VELOCITY_ONLY;
    rerender(<ControlPanel />);
    expect(getButtonsTier(container).querySelectorAll(`.${CSS_CLASSES.BTN}`)).toHaveLength(5);
  });

  it('renders the derived sort buttons and shortcuts when enabled', () => {
    const { container } = render(<ControlPanel />);
    const tier = within(getButtonsTier(container));

    expect(tier.getByText('velocity')).toBeInTheDocument();
    expect(tier.getByText('heat')).toBeInTheDocument();
    expect(tier.getByText('V')).toBeInTheDocument();
    expect(tier.getByText('H')).toBeInTheDocument();
  });

  it('renders the sort by label and divider', () => {
    const { container } = render(<ControlPanel />);
    const tier = within(getButtonsTier(container));
    expect(tier.getByText('sort by:')).toBeInTheDocument();
    expect(tier.getByText('|')).toBeInTheDocument();
  });

  it('renders a separator between each enabled button', () => {
    const { container } = render(<ControlPanel />);
    const separatorCount = (getButtonsTier(container).textContent?.match(/·/g) || []).length;
    expect(separatorCount).toBe(5); // 6 options → 5 separators
  });

  it('renders nothing until the settled flag flips', () => {
    mockSettled = false;
    const { container } = render(<ControlPanel />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText('sort by:')).not.toBeInTheDocument();
  });

  it('publishes the enabled-option count on the panel root and updates it on toggle change', () => {
    const root = document.createElement('span');
    root.id = CONTROL_PANEL_ROOT_ID;
    document.body.appendChild(root);

    const { rerender } = render(<ControlPanel />);
    expect(root.getAttribute(SORT_COUNT_ATTR)).toBe('6');

    mockEnabledSortOptions = NO_DERIVED;
    rerender(<ControlPanel />);
    expect(root.getAttribute(SORT_COUNT_ATTR)).toBe('4');
  });

  it('switches active sort and marks the clicked derived button active', () => {
    const { container } = render(<ControlPanel />);
    fireEvent.click(container.querySelector('button[data-sort="velocity"]')!);

    expect(container.querySelector('button[data-sort="velocity"]')!.classList.contains(CSS_CLASSES.ACTIVE)).toBe(true);
    expect(container.querySelector('button[data-sort="points"]')!.classList.contains(CSS_CLASSES.ACTIVE)).toBe(false);
    expect(mockIncrementSortCount).toHaveBeenCalledOnce();
  });

  describe('conflict note (AE4 render half)', () => {
    it('renders no note when the conflict set is empty', () => {
      const { container } = render(<ControlPanel />);
      expect(container.querySelector(`.${CSS_CLASSES.CONFLICT_NOTE}`)).toBeNull();
    });

    it('renders a note listing each conflicting key as a polite live region', () => {
      mockConflictKeys = new Set(['t', 'c']);
      const { container } = render(<ControlPanel />);

      const note = container.querySelector(`.${CSS_CLASSES.CONFLICT_NOTE}`)!;
      expect(note).not.toBeNull();
      expect(note.getAttribute('role')).toBe('status');
      expect(note.textContent).toContain('T, C');
    });
  });

  describe('mobile dropdown tier', () => {
    it('renders one option per enabled sort with the active one selected', () => {
      const select = renderSelect();
      const options = within(select).getAllByRole('option');
      expect(options).toHaveLength(6);
      expect(select.value).toBe('points');
    });

    it('does not include a disabled sort in the dropdown', () => {
      mockEnabledSortOptions = NO_DERIVED;
      const select = renderSelect();
      const values = within(select)
        .getAllByRole('option')
        .map((o) => (o as HTMLOptionElement).value);
      expect(values).not.toContain('velocity');
      expect(values).not.toContain('heat');
    });

    it('changing the dropdown triggers the same sort path as the buttons', () => {
      const select = renderSelect();
      fireEvent.change(select, { target: { value: 'heat' } });
      expect(select.value).toBe('heat');
      expect(mockIncrementSortCount).toHaveBeenCalledOnce();
    });

    it('renders a divider after the select so it reads separately from HN header links', () => {
      const { container } = render(<ControlPanel />);
      const tier = container.querySelector(`.${CSS_CLASSES.DROPDOWN_TIER}`) as HTMLElement;
      expect(within(tier).getByText('|')).toBeInTheDocument();
    });
  });

  it('renders review toast and dismisses it', () => {
    render(<ControlPanel />);
    expect(screen.getByText(/Leave a review/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Dismiss'));
    expect(mockDismissPrompt).toHaveBeenCalledOnce();
  });

  it('calls restoreAgeTexts when showTrueTimeAgo is false', () => {
    mockShowTrueTimeAgo = false;
    render(<ControlPanel />);
    expect(restoreAgeTexts).toHaveBeenCalled();
  });

  it('calls correctAgeTexts when showTrueTimeAgo is true', () => {
    render(<ControlPanel />);
    expect(correctAgeTexts).toHaveBeenCalled();
  });
});

const renderSelect = (): HTMLSelectElement => {
  render(<ControlPanel />);
  return screen.getByRole('combobox') as HTMLSelectElement;
};
