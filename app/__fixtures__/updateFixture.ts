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

// HN 429s blank/bot user agents and concurrent bursts, so send a browser UA and back off on 429.
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (response.ok) return response;
    // HN's /item throttle window is ~20s; back off long enough to clear it before giving up.
    if (response.status === 429 && attempt < retries) {
      const wait = 15000 * (attempt + 1);
      console.log(`429 for ${url}, retrying in ${wait}ms...`);
      await sleep(wait);
      continue;
    }
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
}

async function fetchAndSave({ url, file }: { url: string; file: string }): Promise<void> {
  console.log(`Fetching ${url}...`);

  const response = await fetchWithRetry(url);
  const html = await response.text();
  const path = join(__dirname, file);
  writeFileSync(path, html, 'utf-8');

  console.log(`Saved ${file} (${(html.length / 1024).toFixed(2)} KB)`);
}

async function main(): Promise<void> {
  // Sequential + spaced so HN doesn't rate-limit the burst.
  for (const target of TARGETS) {
    await fetchAndSave(target);
    if (target !== TARGETS[TARGETS.length - 1]) await sleep(2000);
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
