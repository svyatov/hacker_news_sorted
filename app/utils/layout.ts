import { getControlPanelParentElement } from '~app/utils/selectors';

export const LAYOUT_TIMEOUT_MS = 3000;

// Resolve HN's header cell (the panel parent), waiting via MutationObserver if it isn't in the DOM
// yet. Mirrors the pre-WXT content.tsx getRootContainer; resolves null if it never appears within the
// timeout. Extracted from the entrypoint shell so the observer-vs-timeout race is unit-testable (the
// entrypoints/ dir is outside vitest's include glob), mirroring the badge.ts split. The clearTimeout on
// early resolve stops a stale timeout from flipping layout status to broken after a slow-but-successful
// mount (regression-tested in layout.test.ts).
export const waitForPanelParent = (timeoutMs = LAYOUT_TIMEOUT_MS): Promise<HTMLElement | null> =>
  new Promise((resolve) => {
    const existing = getControlPanelParentElement();
    if (existing) {
      resolve(existing);
      return;
    }

    const timeout = setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeoutMs);

    const observer = new MutationObserver(() => {
      const parent = getControlPanelParentElement();
      if (!parent) return;
      clearTimeout(timeout);
      observer.disconnect();
      resolve(parent);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
