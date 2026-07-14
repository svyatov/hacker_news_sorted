import { createShadowRootUi, defineContentScript } from '#imports';
import { createRoot, type Root } from 'react-dom/client';

import ControlPanel from '~app/components/ControlPanel';
import { CONTROL_PANEL_ROOT_ID, SETTINGS_KEYS } from '~app/constants';
import { getControlPanelParentElement, getTableBody } from '~app/utils/selectors';

import { runStorageProbes } from './probes';

import './style.css';

// Port of content.tsx's Plasmo mount lifecycle to WXT's createShadowRootUi (U2, R2, KTD-2).
// Functionally equivalent: wait for HN's header, verify the list table, set layout status,
// then mount the real ControlPanel into a shadow root.

const LAYOUT_TIMEOUT_MS = 3000;

const setLayoutStatus = (ok: boolean) => {
  chrome.storage.sync.set({ [SETTINGS_KEYS.LAYOUT_OK]: ok });
};

// Resolve HN's header cell (the panel parent), waiting via MutationObserver if it isn't in the DOM
// yet. Mirrors content.tsx:40-67 (getRootContainer); resolves null if it never appears.
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
  // Item/comment pages have no list table (mirrors content.tsx:12).
  excludeMatches: ['*://news.ycombinator.com/item*'],
  // Inject the bundled style.css into the shadow root, not the page.
  cssInjectionMode: 'ui',
  async main(ctx) {
    document.documentElement.dataset.hnsSpikeRan = '1';
    console.log('[HNS spike] content script main() running at', location.href);

    // Gate B storage proofs (U4/U5). Run first, in a real extension context, and publish results
    // for the verify harness. Wrapped so a probe failure never blocks the mount.
    try {
      const probes = await runStorageProbes();
      // Stash on a DOM attribute (shared across content-script/main worlds, unlike window).
      document.documentElement.dataset.hnsProbes = JSON.stringify(probes);
      console.log('[HNS spike] storage probes:', JSON.stringify(probes));
    } catch (err) {
      document.documentElement.dataset.hnsProbes = JSON.stringify({ error: String(err) });
      console.log('[HNS spike] storage probes ERROR:', String(err));
    }
    document.documentElement.dataset.hnsProbesDone = '1';

    const parent = await waitForPanelParent();
    document.documentElement.dataset.hnsSpikeParent = String(!!parent);
    console.log('[HNS spike] parent found?', !!parent, 'tableBody?', !!getTableBody());

    // Layout check mirrors content.tsx verifyAndInject: the list table body must be present too,
    // else flag broken layout and render nothing.
    if (!parent || !getTableBody()) {
      setLayoutStatus(false);
      return;
    }
    setLayoutStatus(true);

    let root: Root | undefined;
    const ui = await createShadowRootUi(ctx, {
      name: 'hns-sort-panel',
      position: 'inline',
      anchor: parent,
      // Prepend into HN's header cell, mirroring injectRootElement's parentElement.prepend.
      append: 'first',
      onMount: (container) => {
        root = createRoot(container);
        root.render(<ControlPanel />);
        return root;
      },
      onRemove: () => {
        root?.unmount();
        root = undefined;
      },
    });
    // Carry the panel root id onto the shadow host (it lives in the light DOM) so ControlPanel's
    // document.getElementById(CONTROL_PANEL_ROOT_ID) data-sort-count publish still resolves.
    ui.shadowHost.id = CONTROL_PANEL_ROOT_ID;
    ui.mount();
  },
});
