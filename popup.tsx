import { useEffect, useState } from 'react';

import { useStorage } from '@plasmohq/storage/hook';

import { SETTINGS_DEFAULTS, SETTINGS_KEYS } from '~app/constants';

import './popup.css';

const Popup = () => {
  const [showNew, setShowNew] = useStorage(SETTINGS_KEYS.SHOW_NEW, SETTINGS_DEFAULTS[SETTINGS_KEYS.SHOW_NEW]);
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

      <div className="hns-setting">
        <span>Highlight new posts</span>
        <label className="hns-toggle">
          <input type="checkbox" checked={showNew} onChange={(e) => setShowNew(e.target.checked)} />
          <span className="hns-toggle-slider" />
        </label>
      </div>
    </div>
  );
};

export default Popup;
