import { defineBackground } from '#imports';

// Spike-only background (branch spike/wxt). Two purposes: (1) confirm the unpacked extension
// actually loaded (the verify harness waits for this service worker), and (2) act as a real
// chrome.storage.sync read/seed channel for the runtime gates (U2 layout-ok, U4/U5). Not the
// real background.ts (badge logic) — that port belongs to the full migration, out of scope.
export default defineBackground(() => {
  console.log('[HNS spike] background service worker loaded');
});
