// React Testing Library registers its own afterEach(cleanup) in every file that imports it (globals: true).
import '@testing-library/jest-dom/vitest';

import { beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

beforeEach(() => fakeBrowser.reset());
