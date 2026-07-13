/**
 * Utility script to fetch and update the HN fixtures.
 * Run with: bun run fixture:update
 *
 * This is similar to VCR in Ruby - it captures real HTML for testing.
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

const HOMEPAGE_URL = 'https://news.ycombinator.com';

/**
 * Pick the item id of the most-commented story on the homepage.
 * Self-healing: never pins to a single thread that HN can later 429 (a nuked/flagged
 * thread serves 429 forever — the old hardcoded id did). Most comments => guaranteed a
 * real, deep comment tree for the comment-selector tests, and never a job post ("discuss").
 */
export function pickTopCommentedItemId(homepageHtml: string): string {
  const matches = [...homepageHtml.matchAll(/item\?id=(\d+)">(\d+)&nbsp;comments/g)];
  if (matches.length === 0) throw new Error('No commented stories found on homepage');
  return matches.reduce((best, m) => (Number(m[2]) > Number(best[2]) ? m : best))[1];
}

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
  console.log(`Fetching ${HOMEPAGE_URL}...`);
  const homepageHtml = await (await fetchWithRetry(HOMEPAGE_URL)).text();
  writeFileSync(join(__dirname, 'hn-homepage.html'), homepageHtml, 'utf-8');
  console.log(`Saved hn-homepage.html (${(homepageHtml.length / 1024).toFixed(2)} KB)`);

  // Derive the item target from the homepage we just fetched, so it can never rot.
  const itemId = pickTopCommentedItemId(homepageHtml);
  await sleep(2000); // spaced so HN doesn't rate-limit the burst
  await fetchAndSave({ url: `${HOMEPAGE_URL}/item?id=${itemId}`, file: 'hn-item.html' });
}

// Skip network when imported (self-check/tests); only run as a script.
if (import.meta.main) {
  main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}
