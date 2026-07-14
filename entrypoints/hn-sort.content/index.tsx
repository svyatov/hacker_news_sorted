import { createIntegratedUi, defineContentScript } from '#imports';
import { createRoot, type Root } from 'react-dom/client';

import ControlPanel from '~app/components/ControlPanel';
import { CONTROL_PANEL_ROOT_ID, SETTINGS_KEYS } from '~app/constants';
import { waitForPanelParent } from '~app/utils/layout';
import { getTableBody } from '~app/utils/selectors';

import './content.css';

// Port of content.tsx's Plasmo mount lifecycle to WXT (U2, R5/R6/R11, KTD-1). Light-DOM
// integrated UI + page-global CSS — not a shadow root — so content.css keeps styling both the
// panel and HN's own list rows (sort-highlight, new-post fade), matching the current behavior.

const setLayoutStatus = (ok: boolean) => {
  chrome.storage.sync.set({ [SETTINGS_KEYS.LAYOUT_OK]: ok });
};

export default defineContentScript({
  matches: ['*://news.ycombinator.com/*'],
  // Pages with HN's header but no story list would render nothing and falsely flag a broken layout, so
  // the panel skips them: comment/thread views (item — also covered by comments.content — plus threads,
  // newcomments, context) and form/profile pages (submit, reply, login, forgot, changepw, newpoll, user,
  // and the x expired-link notice). Every excluded route is listless, so nothing sortable is lost — story
  // lists (submitted/favorites/upvoted/front/ask/show/...) are intentionally NOT excluded. `submit` has no
  // trailing `*` so it can't swallow the `submitted` story list.
  excludeMatches: [
    '*://news.ycombinator.com/item*',
    '*://news.ycombinator.com/threads*',
    '*://news.ycombinator.com/newcomments*',
    '*://news.ycombinator.com/context*',
    '*://news.ycombinator.com/submit',
    '*://news.ycombinator.com/reply*',
    '*://news.ycombinator.com/login*',
    '*://news.ycombinator.com/forgot*',
    '*://news.ycombinator.com/changepw*',
    '*://news.ycombinator.com/newpoll*',
    '*://news.ycombinator.com/user*',
    '*://news.ycombinator.com/x*',
  ],
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
