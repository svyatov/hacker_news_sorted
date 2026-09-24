import { useEffect, useState, type ReactNode } from 'react';

import { useStorage } from '@plasmohq/storage/hook';

import { COOLDOWN_BOUNDS, CWS_REVIEW_URL, SETTINGS_DEFAULTS, SETTINGS_KEYS } from '~app/constants';

import './popup.css';

type SettingsKey = keyof typeof SETTINGS_DEFAULTS;
const useSettingsStorage = <K extends SettingsKey>(key: K) => useStorage(key, SETTINGS_DEFAULTS[key]);

type ToggleProps = {
  name: string;
  label: string;
  ariaLabel?: string;
  hint: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

const Toggle = ({ name, label, ariaLabel = label, hint, checked, onChange }: ToggleProps) => (
  <div className="hns-setting">
    <div className="hns-setting-label">
      <span>{label}</span>
      <span className="hns-hint">{hint}</span>
    </div>
    <label className="hns-toggle">
      <input
        type="checkbox"
        name={name}
        aria-label={ariaLabel}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="hns-toggle-slider" />
    </label>
  </div>
);

const Popup = () => {
  const [showNew, setShowNew] = useSettingsStorage(SETTINGS_KEYS.SHOW_NEW);
  const [cooldown, setCooldown] = useSettingsStorage(SETTINGS_KEYS.COOLDOWN);
  const [trueTimeAgo, setTrueTimeAgo] = useSettingsStorage(SETTINGS_KEYS.TRUE_TIME_AGO);
  const [velocityEnabled, setVelocityEnabled] = useSettingsStorage(SETTINGS_KEYS.VELOCITY_ENABLED);
  const [heatEnabled, setHeatEnabled] = useSettingsStorage(SETTINGS_KEYS.HEAT_ENABLED);
  const [opHighlight, setOpHighlight] = useSettingsStorage(SETTINGS_KEYS.OP_HIGHLIGHT);
  const [markUserHighlight, setMarkUserHighlight] = useSettingsStorage(SETTINGS_KEYS.MARK_USER_HIGHLIGHT);
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
        <Toggle
          name="show-new"
          label="Highlight new posts"
          hint="Mark posts added since your last visit"
          checked={showNew}
          onChange={setShowNew}
        />

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
        <Toggle
          name="true-time-ago"
          label="Show true “time ago”"
          ariaLabel="Show true time ago setting"
          hint="Fix misleading ages on resurfaced posts"
          checked={trueTimeAgo}
          onChange={setTrueTimeAgo}
        />
      </fieldset>

      <fieldset className="hns-group">
        <Toggle
          name="velocity-enabled"
          label="Velocity sort"
          hint={
            <>
              Adds a sort for the fastest-rising posts
              <br />
              (points per hour)
            </>
          }
          checked={velocityEnabled}
          onChange={setVelocityEnabled}
        />
        <Toggle
          name="heat-enabled"
          label="Heat sort"
          hint={
            <>
              Adds a sort for the most-discussed posts
              <br />
              (comments per point)
            </>
          }
          checked={heatEnabled}
          onChange={setHeatEnabled}
        />
      </fieldset>

      <fieldset className="hns-group">
        <Toggle
          name="op-highlight"
          label="Highlight OP comments"
          hint="Tint the story author’s comments on threads"
          checked={opHighlight}
          onChange={setOpHighlight}
        />
        <Toggle
          name="mark-user-highlight"
          label="Marked-user highlighting"
          hint="Tint all comments of the marked user"
          checked={markUserHighlight}
          onChange={setMarkUserHighlight}
        />
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
