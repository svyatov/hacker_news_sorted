// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createStorageMock } from '~app/__fixtures__/testHelpers';
import { SETTINGS_DEFAULTS, SETTINGS_KEYS } from '~app/constants';

const { store, mockGet, mockWatch, mockUnwatch, watcherCallbacks, reset, StorageClass } = createStorageMock();
vi.mock('@plasmohq/storage', () => ({ Storage: StorageClass }));

const { watchSettings } = await import('./settings');

const { SHOW_NEW, COOLDOWN } = SETTINGS_KEYS;
const KEYS = [SHOW_NEW, COOLDOWN] as const;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const emit = (key: string, newValue: unknown) => watcherCallbacks[key]?.({ newValue });

describe('watchSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reset();
  });

  it('calls once when every key has loaded, with stored values and defaults for missing keys', async () => {
    store[COOLDOWN] = 120;
    const onChange = vi.fn();
    watchSettings(KEYS, onChange);
    await flush();

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith({ [SHOW_NEW]: SETTINGS_DEFAULTS[SHOW_NEW], [COOLDOWN]: 120 });
  });

  it('calls with the full snapshot and the changed key on each later change', async () => {
    const onChange = vi.fn();
    watchSettings(KEYS, onChange);
    await flush();

    emit(SHOW_NEW, false);

    expect(onChange).toHaveBeenLastCalledWith({ [SHOW_NEW]: false, [COOLDOWN]: SETTINGS_DEFAULTS[COOLDOWN] }, SHOW_NEW);
  });

  it('falls back to the default when a key is cleared', async () => {
    store[COOLDOWN] = 120;
    const onChange = vi.fn();
    watchSettings(KEYS, onChange);
    await flush();

    emit(COOLDOWN, undefined);

    expect(onChange).toHaveBeenLastCalledWith(
      { [SHOW_NEW]: SETTINGS_DEFAULTS[SHOW_NEW], [COOLDOWN]: SETTINGS_DEFAULTS[COOLDOWN] },
      COOLDOWN,
    );
  });

  it('keeps a change that arrives during the first read instead of the older read value', async () => {
    let resolveRead: (value: unknown) => void = () => {};
    // Hold the first read (SHOW_NEW, keys are read in order) open until after the change arrives.
    mockGet.mockImplementationOnce(() => new Promise((resolve) => (resolveRead = resolve)));
    const onChange = vi.fn();
    watchSettings(KEYS, onChange);

    emit(SHOW_NEW, false);
    resolveRead(true);
    await flush();

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith({ [SHOW_NEW]: false, [COOLDOWN]: SETTINGS_DEFAULTS[COOLDOWN] });
  });

  it('uses the default for a key whose read rejects and still loads the others', async () => {
    store[COOLDOWN] = 120;
    mockGet.mockRejectedValueOnce(new Error('Extension context invalidated.'));
    const onChange = vi.fn();
    watchSettings(KEYS, onChange);
    await flush();

    expect(onChange).toHaveBeenCalledWith({ [SHOW_NEW]: SETTINGS_DEFAULTS[SHOW_NEW], [COOLDOWN]: 120 });
  });

  it('never calls back when disposed before the first read lands, and stops watching', async () => {
    const onChange = vi.fn();
    watchSettings(KEYS, onChange)();
    await flush();

    expect(onChange).not.toHaveBeenCalled();
    expect(mockUnwatch).toHaveBeenCalledWith(mockWatch.mock.calls[0]?.[0]);
  });
});
