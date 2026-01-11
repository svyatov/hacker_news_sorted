import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Load a fixture file from the __fixtures__ directory.
 * Works in Node.js test environment.
 */
export const loadFixture = (filename: string): string => {
  return readFileSync(join(__dirname, filename), 'utf-8');
};

/**
 * Set document.body.innerHTML to the given HTML.
 */
export const setupDocument = (html: string): void => {
  document.body.innerHTML = html;
};

/**
 * Load a fixture file and set it as document.body.innerHTML.
 */
export const loadAndSetupFixture = (filename: string): void => {
  const html = loadFixture(filename);
  setupDocument(html);
};

/**
 * Load the HN homepage fixture.
 * Update with: bun run fixture:update
 */
export const loadHNHomepage = (): string => {
  return loadFixture('hn-homepage.html');
};

/**
 * Setup document with HN homepage fixture.
 * Update with: bun run fixture:update
 */
export const setupHNHomepage = (): void => {
  loadAndSetupFixture('hn-homepage.html');
};
