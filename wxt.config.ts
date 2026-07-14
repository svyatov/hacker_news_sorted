import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'wxt';

export default defineConfig({
  // The codebase imports via the `~app/*` alias (mirrors Plasmo's tsconfig `~*` wildcard).
  alias: {
    '~app': resolve(import.meta.dirname, 'app'),
  },
  manifest: {
    // WXT does not read package.json `displayName`; `name` would otherwise default to the
    // (typo'd, lowercase) package `name`. Set it explicitly (KTD-5). `version` auto-reads from package.json.
    name: 'Hacker News Sorted',
    description:
      'Instantly sort Hacker News by points, time, comments, velocity, or heat, mark new posts, and highlight comment authors.',
    host_permissions: ['https://news.ycombinator.com/*'],
    // Gates all of chrome.storage — required by every entrypoint's @plasmohq/storage usage.
    permissions: ['storage'],
  },
  // Reuse the already-installed React plugin rather than adding @wxt-dev/module-react.
  vite: () => ({
    plugins: [react()],
  }),
});
