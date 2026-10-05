// React Testing Library registers its own afterEach(cleanup) in every file that imports it (globals: true).
import '@testing-library/jest-dom/vitest';

import { beforeEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

beforeEach(() => {
  fakeBrowser.reset();
  // JSDOM has no layout engine; geometry-sensitive tests supply their own observer callbacks.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
});
