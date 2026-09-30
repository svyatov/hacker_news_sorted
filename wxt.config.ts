import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'wxt';

export default defineConfig({
  // The codebase imports via the `~app/*` alias (mirrors Plasmo's tsconfig `~*` wildcard).
  alias: {
    '~app': resolve(import.meta.dirname, 'app'),
  },
  outDir: 'build',
  // Package `name` is the typo'd `hacked_news_sorted`; keep the zip filename sane.
  zip: { name: 'hacker-news-sorted' },
  manifest: {
    // WXT does not read package.json `displayName`; `name` would otherwise default to the
    // (typo'd, lowercase) package `name`. Set it explicitly (KTD-5). `version` auto-reads from package.json.
    name: 'Hacker News Sorted',
    description:
      'Instantly sort Hacker News by points, time, comments, velocity, or heat, mark new posts, and highlight comment authors.',
    host_permissions: ['https://news.ycombinator.com/*'],
    // Gates all of chrome.storage: required by every entrypoint's WXT `storage` usage.
    permissions: ['storage'],
  },
  hooks: {
    // `bun dev` builds use the color-swapped icons in public-dev/ so they are easy to tell from the store version.
    'build:publicAssets': (wxt, files) => {
      if (wxt.config.mode !== 'development') return;
      for (const file of files) {
        if ('absoluteSrc' in file && file.relativeDest.startsWith('icon/')) {
          file.absoluteSrc = resolve(import.meta.dirname, 'public-dev', file.relativeDest);
        }
      }
    },
  },
  // Reuse the already-installed React plugin rather than adding @wxt-dev/module-react.
  vite: () => ({
    plugins: [react()],
  }),
});
