import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import Popup from '~/entrypoints/popup/App';
import { COOLDOWN_BOUNDS, SETTINGS_KEYS } from '~app/constants';

const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));
// Values as Plasmo wrote them: every value a JSON string.
const store = (values: Record<string, unknown>) =>
  fakeBrowser.storage.sync.set(Object.fromEntries(Object.entries(values).map(([k, v]) => [k, JSON.stringify(v)])));
const stored = async (key: string) => (await fakeBrowser.storage.sync.get(key))[key];
const mount = async () => {
  render(<Popup />);
  await flush();
};

describe('Popup', () => {
  afterEach(() => vi.restoreAllMocks());

  it('should not show warning when layout is ok', async () => {
    await store({ [SETTINGS_KEYS.LAYOUT_OK]: true });
    await mount();

    expect(screen.queryByText('Sorting temporarily unavailable :(')).not.toBeInTheDocument();
  });

  it('should show warning banner when the raw boolean layout flag is false', async () => {
    await fakeBrowser.storage.sync.set({ [SETTINGS_KEYS.LAYOUT_OK]: false });
    await mount();

    expect(screen.getByText('Sorting temporarily unavailable :(')).toBeInTheDocument();
    expect(screen.getByText(/a fix is on the way/)).toBeInTheDocument();
  });

  it('should render settings heading', async () => {
    await mount();

    expect(screen.getByText('HN Sorted Settings')).toBeInTheDocument();
  });

  it('should render highlight new posts toggle', async () => {
    await mount();

    expect(screen.getByLabelText('Highlight new posts')).toBeInTheDocument();
  });

  it('should render persistent review link', async () => {
    await mount();

    const link = screen.getByText(/Leave a review/);
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', expect.stringContaining('chromewebstore.google.com'));
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('should show cooldown input when showNew is true', async () => {
    await store({ [SETTINGS_KEYS.SHOW_NEW]: true });
    await mount();

    const input = screen.getByLabelText('Highlight duration in seconds');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'number');
    expect(input).toHaveAttribute('min', String(COOLDOWN_BOUNDS.MIN));
    expect(input).toHaveAttribute('max', String(COOLDOWN_BOUNDS.MAX));
  });

  it('should hide cooldown input when a stored "false" turns showNew off', async () => {
    await store({ [SETTINGS_KEYS.SHOW_NEW]: false });
    await mount();

    expect(screen.queryByLabelText('Highlight duration in seconds')).not.toBeInTheDocument();
  });

  it('should display the stored cooldown value', async () => {
    await store({ [SETTINGS_KEYS.SHOW_NEW]: true, [SETTINGS_KEYS.COOLDOWN]: 300 });
    await mount();

    const input = screen.getByLabelText('Highlight duration in seconds') as HTMLInputElement;
    expect(input.value).toBe('300');
  });

  it('should render Velocity and Heat toggles reflecting stored state', async () => {
    await store({ [SETTINGS_KEYS.VELOCITY_ENABLED]: true, [SETTINGS_KEYS.HEAT_ENABLED]: false });
    await mount();

    expect((screen.getByLabelText('Velocity sort') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Heat sort') as HTMLInputElement).checked).toBe(false);
  });

  it('should write a JSON string when a derived-sort toggle is clicked', async () => {
    await store({ [SETTINGS_KEYS.VELOCITY_ENABLED]: true });
    await mount();

    fireEvent.click(screen.getByLabelText('Velocity sort'));
    await flush();

    expect((screen.getByLabelText('Velocity sort') as HTMLInputElement).checked).toBe(false);
    expect(await stored(SETTINGS_KEYS.VELOCITY_ENABLED)).toBe('false');
  });

  it('should render OP and marked-user toggles checked by default', async () => {
    await mount();

    expect((screen.getByLabelText('Highlight OP comments') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Marked-user highlighting') as HTMLInputElement).checked).toBe(true);
  });

  it('should write false when the OP highlight toggle is clicked', async () => {
    await mount();

    fireEvent.click(screen.getByLabelText('Highlight OP comments'));
    await flush();

    expect(await stored(SETTINGS_KEYS.OP_HIGHLIGHT)).toBe('false');
  });

  it('should write false when the marked-user highlight toggle is clicked', async () => {
    await mount();

    fireEvent.click(screen.getByLabelText('Marked-user highlighting'));
    await flush();

    expect(await stored(SETTINGS_KEYS.MARK_USER_HIGHLIGHT)).toBe('false');
  });

  it('should show each cooldown keystroke at once and write it as a JSON string', async () => {
    await mount();
    const input = screen.getByLabelText('Highlight duration in seconds') as HTMLInputElement;
    // A slow write: the input must not wait for it.
    const realSet = fakeBrowser.storage.sync.set.bind(fakeBrowser.storage.sync);
    vi.spyOn(fakeBrowser.storage.sync, 'set').mockImplementation(async (items) => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return realSet(items);
    });

    fireEvent.change(input, { target: { value: '45' } });

    expect(input.value).toBe('45');
    await waitFor(async () => expect(await stored(SETTINGS_KEYS.COOLDOWN)).toBe('45'));
  });

  it('should show an empty input, not a leading 0, after the cooldown is cleared', async () => {
    await mount();
    const input = screen.getByLabelText('Highlight duration in seconds') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '' } });

    expect(input.value).toBe('');
  });

  it('should clamp the cooldown into bounds on blur', async () => {
    await mount();
    const input = screen.getByLabelText('Highlight duration in seconds') as HTMLInputElement;

    fireEvent.change(input, { target: { value: String(COOLDOWN_BOUNDS.MAX + 1) } });
    fireEvent.blur(input);
    await flush();

    expect(input.value).toBe(String(COOLDOWN_BOUNDS.MAX));
    expect(await stored(SETTINGS_KEYS.COOLDOWN)).toBe(String(COOLDOWN_BOUNDS.MAX));
  });

  it('should follow a setting changed elsewhere while open', async () => {
    await mount();

    await store({ [SETTINGS_KEYS.HEAT_ENABLED]: false });
    await flush();

    expect((screen.getByLabelText('Heat sort') as HTMLInputElement).checked).toBe(false);
  });
});
