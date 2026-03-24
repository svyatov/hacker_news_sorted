import { useEffect, useState } from 'react';

import { useStorage } from '@plasmohq/storage/hook';

import { COOLDOWN_BOUNDS, CWS_REVIEW_URL, SETTINGS_DEFAULTS, SETTINGS_KEYS } from '~app/constants';

import './popup.css';

type SettingsKey = keyof typeof SETTINGS_DEFAULTS;
const useSettingsStorage = <K extends SettingsKey>(key: K) => useStorage(key, SETTINGS_DEFAULTS[key]);

const Popup = () => {
  const [showNew, setShowNew] = useSettingsStorage(SETTINGS_KEYS.SHOW_NEW);
  const [cooldown, setCooldown] = useSettingsStorage(SETTINGS_KEYS.COOLDOWN);
  const [trueTimeAgo, setTrueTimeAgo] = useSettingsStorage(SETTINGS_KEYS.TRUE_TIME_AGO);
  const [layoutOk] = useSettingsStorage(SETTINGS_KEYS.LAYOUT_OK);
  // useStorage renders with the default value first, then async-loads the stored value.
  // When stored !== default, the CSS transition animates the toggle visibly (on→off flash).
  // Suppress transitions for 50ms to let storage settle, then re-enable for user interactions.
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={isReady ? undefined : 'hns-no-transition'}>
      <h1>HN Sorted Settings</h1>

      {layoutOk === false && (
        <div className="hns-warning">
          <strong>Sorting temporarily unavailable :(</strong>
          <p>
            Hacker News appears to have changed its page layout. We’re aware, and a fix is on the way. Thanks for your
            patience!
          </p>
        </div>
      )}

      <fieldset className="hns-group">
        <div className="hns-setting">
          <div className="hns-setting-label">
            <span>Highlight new posts</span>
            <span className="hns-hint">Mark posts added since your last visit</span>
          </div>
          <label className="hns-toggle">
            <input
              type="checkbox"
              name="show-new"
              aria-label="Highlight new posts"
              checked={showNew}
              onChange={(e) => setShowNew(e.target.checked)}
            />
            <span className="hns-toggle-slider" />
          </label>
        </div>

        {showNew && (
          <div className="hns-setting hns-setting-child">
            <div className="hns-setting-label">
              <span>Highlight duration in seconds</span>
              <span className="hns-hint">How long the indicator stays visible</span>
            </div>
            <input
              type="number"
              name="cooldown"
              aria-label="Highlight duration in seconds"
              min={COOLDOWN_BOUNDS.MIN}
              max={COOLDOWN_BOUNDS.MAX}
              value={cooldown}
              onChange={(e) => setCooldown(Number(e.target.value))}
              onBlur={(e) =>
                setCooldown(
                  Math.max(
                    COOLDOWN_BOUNDS.MIN,
                    Math.min(COOLDOWN_BOUNDS.MAX, Number(e.target.value) || SETTINGS_DEFAULTS[SETTINGS_KEYS.COOLDOWN]),
                  ),
                )
              }
              className="hns-number-input"
            />
          </div>
        )}
      </fieldset>

      <fieldset className="hns-group">
        <div className="hns-setting">
          <div className="hns-setting-label">
            <span>Show true &ldquo;time ago&rdquo;</span>
            <span className="hns-hint">Fix misleading ages on resurfaced posts</span>
          </div>
          <label className="hns-toggle">
            <input
              type="checkbox"
              name="true-time-ago"
              aria-label="Show true time ago setting"
              checked={trueTimeAgo}
              onChange={(e) => setTrueTimeAgo(e.target.checked)}
            />
            <span className="hns-toggle-slider" />
          </label>
        </div>
      </fieldset>

      <div className="hns-review-link">
        Enjoying HN Sorted?{' '}
        <a href={CWS_REVIEW_URL} target="_blank" rel="noopener">
          {'Leave a review \u2764\ufe0f'}
        </a>
      </div>
    </div>
  );
};

export default Popup;
