// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import { SETTINGS_DEFAULTS, SETTINGS_KEYS } from '~app/constants';

import { watchSettings } from './settings';

const { SHOW_NEW, COOLDOWN } = SETTINGS_KEYS;
const KEYS = [SHOW_NEW, COOLDOWN] as const;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
// Values as Plasmo wrote them: every value a JSON string.
const seed = (items: Record<string, unknown>) => fakeBrowser.storage.sync.set(items);

describe('watchSettings', () => {
  it('reads Plasmo JSON strings: "false" as false and "15" as 15', async () => {
    await seed({ [SHOW_NEW]: 'false', [COOLDOWN]: '15' });
    const onChange = vi.fn();
    watchSettings(KEYS, onChange);
    await flush();

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith({ [SHOW_NEW]: false, [COOLDOWN]: 15 });
  });

  it('uses the default for a missing key', async () => {
    await seed({ [COOLDOWN]: '120' });
    const onChange = vi.fn();
    watchSettings(KEYS, onChange);
    await flush();

    expect(onChange).toHaveBeenCalledWith({ [SHOW_NEW]: SETTINGS_DEFAULTS[SHOW_NEW], [COOLDOWN]: 120 });
  });

  it('uses the default for an unparsable value', async () => {
    await seed({ [SHOW_NEW]: 'not json', [COOLDOWN]: '120' });
    const onChange = vi.fn();
    watchSettings(KEYS, onChange);
    await flush();

    expect(onChange).toHaveBeenCalledWith({ [SHOW_NEW]: SETTINGS_DEFAULTS[SHOW_NEW], [COOLDOWN]: 120 });
  });

  it('calls with the full snapshot and the changed key, decoded, on each later change', async () => {
    const onChange = vi.fn();
    watchSettings(KEYS, onChange);
    await flush();

    await seed({ [SHOW_NEW]: 'false' });
    await flush();

    expect(onChange).toHaveBeenLastCalledWith({ [SHOW_NEW]: false, [COOLDOWN]: SETTINGS_DEFAULTS[COOLDOWN] }, SHOW_NEW);
  });

  it('falls back to the default when a key is removed', async () => {
    await seed({ [COOLDOWN]: '120' });
    const onChange = vi.fn();
    watchSettings(KEYS, onChange);
    await flush();

    await fakeBrowser.storage.sync.remove(COOLDOWN);
    await flush();

    expect(onChange).toHaveBeenLastCalledWith(
      { [SHOW_NEW]: SETTINGS_DEFAULTS[SHOW_NEW], [COOLDOWN]: SETTINGS_DEFAULTS[COOLDOWN] },
      COOLDOWN,
    );
  });

  it('keeps a change that arrives during the first read instead of the older read value', async () => {
    await seed({ [SHOW_NEW]: 'true' });
    const onChange = vi.fn();
    watchSettings(KEYS, onChange);

    // The change lands while the first reads are still pending.
    await seed({ [SHOW_NEW]: 'false' });
    await flush();

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith({ [SHOW_NEW]: false, [COOLDOWN]: SETTINGS_DEFAULTS[COOLDOWN] });
  });

  it('uses the default for a key whose read rejects and still loads the others', async () => {
    await seed({ [COOLDOWN]: '120' });
    const get = fakeBrowser.storage.sync.get;
    vi.spyOn(fakeBrowser.storage.sync, 'get').mockImplementation((keys?: unknown) =>
      keys === SHOW_NEW ? Promise.reject(new Error('Extension context invalidated.')) : get(keys as string),
    );
    const onChange = vi.fn();
    watchSettings(KEYS, onChange);
    await flush();

    expect(onChange).toHaveBeenCalledWith({ [SHOW_NEW]: SETTINGS_DEFAULTS[SHOW_NEW], [COOLDOWN]: 120 });
  });

  it('never calls back when disposed before the first read lands, and stops watching', async () => {
    const onChange = vi.fn();
    watchSettings(KEYS, onChange)();
    await flush();
    await seed({ [SHOW_NEW]: 'false' });
    await flush();

    expect(onChange).not.toHaveBeenCalled();
  });
});
