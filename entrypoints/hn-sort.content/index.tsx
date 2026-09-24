import { createIntegratedUi, defineContentScript } from '#imports';
import { createRoot, type Root } from 'react-dom/client';

import ControlPanel from '~app/components/ControlPanel';
import { CONTROL_PANEL_ROOT_ID, SETTINGS_KEYS, SORT_PANEL_EXCLUDE_MATCHES } from '~app/constants';
import { waitForPanelParent } from '~app/utils/layout';
import { trackNewPosts } from '~app/utils/newPosts';
import { getTableBody } from '~app/utils/selectors';

import './content.css';

const setLayoutStatus = (ok: boolean) => {
  chrome.storage.sync.set({ [SETTINGS_KEYS.LAYOUT_OK]: ok });
};

export default defineContentScript({
  matches: ['*://news.ycombinator.com/*'],
  // Listless pages (see SORT_PANEL_EXCLUDE_MATCHES) never load the panel, so they can't falsely flag a broken layout.
  excludeMatches: SORT_PANEL_EXCLUDE_MATCHES,
  // Page-global stylesheet: content.css styles both the light-DOM panel and HN's own list rows
  // (sort highlight, new-post fade), so it's injected page-wide via the manifest (KTD-1).
  cssInjectionMode: 'manifest',
  noScriptStartedPostMessage: true,
  async main(ctx) {
    const parent = await waitForPanelParent();

    // The list table body must be present too, else flag broken layout and render nothing.
    if (!parent || !getTableBody()) {
      setLayoutStatus(false);
      return;
    }
    setLayoutStatus(true);
    ctx.onInvalidated(trackNewPosts());

    let root: Root | undefined;
    const ui = createIntegratedUi(ctx, {
      position: 'inline',
      anchor: parent,
      // Prepend into HN's header cell.
      append: 'first',
      // A <span id="hns-control-panel"> (KTD-1), so content.css's #hns-control-panel rule and
      // ControlPanel's data-sort-count publish resolve.
      tag: 'span',
      onMount: (wrapper) => {
        wrapper.id = CONTROL_PANEL_ROOT_ID;
        root = createRoot(wrapper);
        root.render(<ControlPanel />);
        return root;
      },
      onRemove: () => {
        root?.unmount();
        root = undefined;
      },
    });
    ui.mount();
  },
});
