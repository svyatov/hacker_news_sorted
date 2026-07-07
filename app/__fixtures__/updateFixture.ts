/**
 * Utility script to fetch and update the HN fixtures.
 * Run with: bun run fixture:update
 *
 * This is similar to VCR in Ruby - it captures real HTML for testing.
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

// A canonical story thread — its .fatitem carries a titleline and the tree has real comments.
const TARGETS: Array<{ url: string; file: string }> = [
  { url: 'https://news.ycombinator.com', file: 'hn-homepage.html' },
  { url: 'https://news.ycombinator.com/item?id=48814952', file: 'hn-item.html' },
];

async function fetchAndSave({ url, file }: { url: string; file: string }): Promise<void> {
  console.log(`Fetching ${url}...`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const path = join(__dirname, file);
  writeFileSync(path, html, 'utf-8');

  console.log(`Saved ${file} (${(html.length / 1024).toFixed(2)} KB)`);
}

Promise.all(TARGETS.map(fetchAndSave)).catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
