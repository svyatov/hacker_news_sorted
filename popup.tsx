import { useStorage } from '@plasmohq/storage/hook';

import { SETTINGS_DEFAULTS, SETTINGS_KEYS } from '~app/utils/settings';

import './popup.css';

const Popup = () => {
  const [showNew, setShowNew] = useStorage(SETTINGS_KEYS.SHOW_NEW, SETTINGS_DEFAULTS[SETTINGS_KEYS.SHOW_NEW]);

  return (
    <>
      <h1>HN Sorted Settings</h1>

      <div className="hns-setting">
        <span>Highlight new posts</span>
        <label className="hns-toggle">
          <input type="checkbox" checked={showNew} onChange={(e) => setShowNew(e.target.checked)} />
          <span className="hns-toggle-slider" />
        </label>
      </div>
    </>
  );
};

export default Popup;
