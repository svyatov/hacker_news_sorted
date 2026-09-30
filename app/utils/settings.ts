import { SETTINGS_DEFAULTS } from '~app/constants';
import { settingsStorage } from '~app/utils/settingsStorage';

type SettingKey = keyof typeof SETTINGS_DEFAULTS;
type SettingValues<K extends SettingKey> = { [P in K]: (typeof SETTINGS_DEFAULTS)[P] };

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

  const unwatchers = keys.map((key) =>
    settingsStorage.watch<SettingValues<K>[K]>(key, (newValue) => {
      touched.add(key);
      values[key] = newValue ?? SETTINGS_DEFAULTS[key];
      if (ready) onChange({ ...values }, key);
    }),
  );

  const read = async (key: K) => {
    const stored = await settingsStorage.get<SettingValues<K>[K]>(key).catch(() => undefined);
    if (!touched.has(key)) values[key] = stored ?? SETTINGS_DEFAULTS[key];
  };

  Promise.all(keys.map(read)).then(() => {
    if (disposed) return;
    ready = true;
    onChange({ ...values });
  });

  return () => {
    disposed = true;
    for (const unwatch of unwatchers) unwatch();
  };
};
