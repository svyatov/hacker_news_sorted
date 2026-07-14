import { createIntegratedUi, defineContentScript } from '#imports';
import { createRoot, type Root } from 'react-dom/client';

import ControlPanel from '~app/components/ControlPanel';
import { CONTROL_PANEL_ROOT_ID, SETTINGS_KEYS } from '~app/constants';
import { getControlPanelParentElement, getTableBody } from '~app/utils/selectors';

import './content.css';

// Port of content.tsx's Plasmo mount lifecycle to WXT (U2, R5/R6/R11, KTD-1). Light-DOM
// integrated UI + page-global CSS — not a shadow root — so content.css keeps styling both the
// panel and HN's own list rows (sort-highlight, new-post fade), matching the current behavior.

const LAYOUT_TIMEOUT_MS = 3000;

const setLayoutStatus = (ok: boolean) => {
  chrome.storage.sync.set({ [SETTINGS_KEYS.LAYOUT_OK]: ok });
};

// Resolve HN's header cell (the panel parent), waiting via MutationObserver if it isn't in the DOM
// yet. Mirrors content.tsx's getRootContainer; resolves null if it never appears within the timeout.
const waitForPanelParent = (): Promise<HTMLElement | null> =>
  new Promise((resolve) => {
    const existing = getControlPanelParentElement();
    if (existing) {
      resolve(existing);
      return;
    }

    const observer = new MutationObserver(() => {
      const parent = getControlPanelParentElement();
      if (!parent) return;
      observer.disconnect();
      resolve(parent);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, LAYOUT_TIMEOUT_MS);
  });

export default defineContentScript({
  matches: ['*://news.ycombinator.com/*'],
  // Item/comment pages have no list table; the panel would render nothing and falsely flag a broken
  // layout. The comment-highlight script (comments.content) covers those pages instead.
  excludeMatches: ['*://news.ycombinator.com/item*'],
  // Page-global stylesheet (like Plasmo's `css: ['content.css']`): content.css styles both the panel
  // and HN's own list rows, so it's injected page-wide via the manifest, not into a shadow root (KTD-1).
  cssInjectionMode: 'manifest',
  async main(ctx) {
    const parent = await waitForPanelParent();

    // Layout check mirrors content.tsx's verifyAndInject: the list table body must be present too,
    // else flag broken layout and render nothing.
    if (!parent || !getTableBody()) {
      setLayoutStatus(false);
      return;
    }
    setLayoutStatus(true);

    let root: Root | undefined;
    const ui = createIntegratedUi(ctx, {
      position: 'inline',
      anchor: parent,
      // Prepend into HN's header cell, mirroring injectRootElement's parentElement.prepend.
      append: 'first',
      // Reproduce content.tsx's hand-prepended <span id="hns-control-panel"> (KTD-1) so content.css's
      // #hns-control-panel rule and ControlPanel's data-sort-count publish still resolve.
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
