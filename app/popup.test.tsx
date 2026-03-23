import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SETTINGS_KEYS } from '~app/constants';

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
});
