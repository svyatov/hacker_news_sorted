import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { COOLDOWN_BOUNDS, SETTINGS_KEYS } from '~app/constants';

let storageValues: Record<string, unknown> = {};

vi.mock('@plasmohq/storage/hook', () => ({
  useStorage: (key: string, defaultValue: unknown) => {
    const value = key in storageValues ? storageValues[key] : defaultValue;
    return [value, vi.fn()];
  },
}));

// Lazy import so mock is in place
const { default: Popup } = await import('~/popup');

describe('Popup', () => {
  it('should not show warning when layout is ok', () => {
    storageValues = { [SETTINGS_KEYS.LAYOUT_OK]: true };
    render(<Popup />);

    expect(screen.queryByText('Sorting temporarily unavailable')).not.toBeInTheDocument();
  });

  it('should show warning banner when layout is broken', () => {
    storageValues = { [SETTINGS_KEYS.LAYOUT_OK]: false };
    render(<Popup />);

    expect(screen.getByText('Sorting temporarily unavailable :(')).toBeInTheDocument();
    expect(screen.getByText(/a fix is on the way/)).toBeInTheDocument();
  });

  it('should render settings heading', () => {
    storageValues = {};
    render(<Popup />);

    expect(screen.getByText('HN Sorted Settings')).toBeInTheDocument();
  });

  it('should render highlight new posts toggle', () => {
    storageValues = {};
    render(<Popup />);

    expect(screen.getByLabelText('Highlight new posts')).toBeInTheDocument();
  });

  it('should render persistent review link', () => {
    storageValues = {};
    render(<Popup />);

    const link = screen.getByText(/Leave a review/);
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', expect.stringContaining('chromewebstore.google.com'));
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('should show cooldown input when showNew is true', () => {
    storageValues = { [SETTINGS_KEYS.SHOW_NEW]: true };
    render(<Popup />);

    const input = screen.getByLabelText('Fade duration in seconds');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'number');
    expect(input).toHaveAttribute('min', String(COOLDOWN_BOUNDS.MIN));
    expect(input).toHaveAttribute('max', String(COOLDOWN_BOUNDS.MAX));
  });

  it('should hide cooldown input when showNew is false', () => {
    storageValues = { [SETTINGS_KEYS.SHOW_NEW]: false };
    render(<Popup />);

    expect(screen.queryByLabelText('Fade duration in seconds')).not.toBeInTheDocument();
  });

  it('should display default cooldown value', () => {
    storageValues = { [SETTINGS_KEYS.SHOW_NEW]: true, [SETTINGS_KEYS.COOLDOWN]: 300 };
    render(<Popup />);

    const input = screen.getByLabelText('Fade duration in seconds') as HTMLInputElement;
    expect(input.value).toBe('300');
  });
});
