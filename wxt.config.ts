import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'wxt';

// Spike: WXT config living alongside Plasmo on the spike/wxt branch (KTD-1). Never merged.
export default defineConfig({
  // The codebase imports via the `~app/*` alias (mirrors Plasmo's tsconfig `~*` wildcard).
  alias: {
    '~app': resolve(import.meta.dirname, 'app'),
  },
  manifest: {
    // Carried from package.json's Plasmo `manifest` override (KTD-5).
    host_permissions: ['https://news.ycombinator.com/*'],
    // Gates all of chrome.storage — required by BOTH storage paths (U4/U5), see KTD-5.
    permissions: ['storage'],
  },
  // Reuse the already-installed React plugin rather than adding @wxt-dev/module-react.
  vite: () => ({
    plugins: [react()],
  }),
});
