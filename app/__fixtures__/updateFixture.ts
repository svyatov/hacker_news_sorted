/**
 * Utility script to fetch and update the HN homepage fixture.
 * Run with: npx tsx app/__fixtures__/updateFixture.ts
 *
 * This is similar to VCR in Ruby - it captures real HTML for testing.
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

const HN_URL = 'https://news.ycombinator.com';
const FIXTURE_PATH = join(__dirname, 'hn-homepage.html');

async function fetchAndSaveFixture(): Promise<void> {
  console.log(`Fetching ${HN_URL}...`);

  const response = await fetch(HN_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  writeFileSync(FIXTURE_PATH, html, 'utf-8');

  console.log(`Saved fixture to ${FIXTURE_PATH}`);
  console.log(`Size: ${(html.length / 1024).toFixed(2)} KB`);
}

fetchAndSaveFixture().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
