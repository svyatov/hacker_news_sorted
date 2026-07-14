import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { COOLDOWN_BOUNDS, SETTINGS_KEYS } from '~app/constants';

let storageValues: Record<string, unknown> = {};
const setters: Record<string, ReturnType<typeof vi.fn>> = {};

vi.mock('@plasmohq/storage/hook', () => ({
  useStorage: (key: string, defaultValue: unknown) => {
    const value = key in storageValues ? storageValues[key] : defaultValue;
    setters[key] = setters[key] ?? vi.fn();
    return [value, setters[key]];
  },
}));

// Lazy import so mock is in place
const { default: Popup } = await import('~/entrypoints/popup/App');

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

    const input = screen.getByLabelText('Highlight duration in seconds');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'number');
    expect(input).toHaveAttribute('min', String(COOLDOWN_BOUNDS.MIN));
    expect(input).toHaveAttribute('max', String(COOLDOWN_BOUNDS.MAX));
  });

  it('should hide cooldown input when showNew is false', () => {
    storageValues = { [SETTINGS_KEYS.SHOW_NEW]: false };
    render(<Popup />);

    expect(screen.queryByLabelText('Highlight duration in seconds')).not.toBeInTheDocument();
  });

  it('should display default cooldown value', () => {
    storageValues = { [SETTINGS_KEYS.SHOW_NEW]: true, [SETTINGS_KEYS.COOLDOWN]: 300 };
    render(<Popup />);

    const input = screen.getByLabelText('Highlight duration in seconds') as HTMLInputElement;
    expect(input.value).toBe('300');
  });

  it('should render Velocity and Heat toggles reflecting stored state', () => {
    storageValues = { [SETTINGS_KEYS.VELOCITY_ENABLED]: true, [SETTINGS_KEYS.HEAT_ENABLED]: false };
    render(<Popup />);

    expect((screen.getByLabelText('Velocity sort') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Heat sort') as HTMLInputElement).checked).toBe(false);
  });

  it('should write the new value when a derived-sort toggle is clicked', () => {
    storageValues = { [SETTINGS_KEYS.VELOCITY_ENABLED]: true };
    render(<Popup />);

    const setVelocity = setters[SETTINGS_KEYS.VELOCITY_ENABLED];
    setVelocity.mockClear();
    fireEvent.click(screen.getByLabelText('Velocity sort'));
    expect(setVelocity).toHaveBeenCalledWith(false);
  });

  it('should render OP and marked-user toggles checked by default', () => {
    storageValues = {};
    render(<Popup />);

    expect((screen.getByLabelText('Highlight OP comments') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Marked-user highlighting') as HTMLInputElement).checked).toBe(true);
  });

  it('should write false when the OP highlight toggle is clicked', () => {
    storageValues = { [SETTINGS_KEYS.OP_HIGHLIGHT]: true };
    render(<Popup />);

    const setOp = setters[SETTINGS_KEYS.OP_HIGHLIGHT];
    setOp.mockClear();
    fireEvent.click(screen.getByLabelText('Highlight OP comments'));
    expect(setOp).toHaveBeenCalledWith(false);
  });

  it('should write false when the marked-user highlight toggle is clicked', () => {
    storageValues = { [SETTINGS_KEYS.MARK_USER_HIGHLIGHT]: true };
    render(<Popup />);

    const setMark = setters[SETTINGS_KEYS.MARK_USER_HIGHLIGHT];
    setMark.mockClear();
    fireEvent.click(screen.getByLabelText('Marked-user highlighting'));
    expect(setMark).toHaveBeenCalledWith(false);
  });
});
