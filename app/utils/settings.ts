import { Storage, type StorageCallbackMap } from '@plasmohq/storage';

import { SETTINGS_DEFAULTS } from '~app/constants';

type SettingKey = keyof typeof SETTINGS_DEFAULTS;
export type SettingValues<K extends SettingKey> = { [P in K]: (typeof SETTINGS_DEFAULTS)[P] };

const storage = new Storage();

// Calls onChange once every key has loaded (changed undefined), then once per change (changed = that key),
// always with a full snapshot, defaults applied. A change that lands during the first read wins over it,
// and a rejected read degrades to the default. Returns dispose.
export const watchSettings = <K extends SettingKey>(
  keys: readonly K[],
  onChange: (values: SettingValues<K>, changed?: K) => void,
): (() => void) => {
  const values = Object.fromEntries(keys.map((key) => [key, SETTINGS_DEFAULTS[key]])) as SettingValues<K>;
  const touched = new Set<K>();
  let ready = false;
  let disposed = false;

  const watchers: StorageCallbackMap = Object.fromEntries(
    keys.map((key) => [
      key,
      (change: { newValue?: unknown }) => {
        touched.add(key);
        values[key] = (change.newValue as SettingValues<K>[K] | undefined) ?? SETTINGS_DEFAULTS[key];
        if (ready) onChange({ ...values }, key);
      },
    ]),
  );
  storage.watch(watchers);

  const read = async (key: K) => {
    const stored = await storage.get<SettingValues<K>[K]>(key).catch(() => undefined);
    if (!touched.has(key)) values[key] = stored ?? SETTINGS_DEFAULTS[key];
  };

  Promise.all(keys.map(read)).then(() => {
    if (disposed) return;
    ready = true;
    onChange({ ...values });
  });

  return () => {
    disposed = true;
    storage.unwatch(watchers);
  };
};
