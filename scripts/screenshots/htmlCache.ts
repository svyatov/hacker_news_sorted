import fs from 'node:fs';
import path from 'node:path';
import type { Page } from 'playwright';

// Local HTML cache so the generators don't re-fetch live HN on every run. HN rate-limits its /item
// endpoint hard (429 after a handful of hits), and marketing assets never need to be fresher than
// daily. The first run of the day fetches live and caches the document; later runs replay it. Only the
// top-level document is served from cache — sub-resources (news.css, images) still load live from HN
// against the real page URL, so the page stays fully styled, and those static assets aren't throttled.
// @ts-expect-error Bun-specific API
const CACHE_DIR = path.join(import.meta.dir, '.hn-cache');
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 1 day

function cacheFileFor(url: string): string {
  const slug = url.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '_');
  return path.join(CACHE_DIR, `${slug}.html`);
}

// Navigate to `url`, serving a cached copy of the document when one exists and is < 1 day old;
// otherwise fetch live (throwing on a non-OK status, e.g. HN's 429) and refresh the cache.
export async function gotoCached(page: Page, url: string): Promise<void> {
  const file = cacheFileFor(url);
  const fresh = fs.existsSync(file) && Date.now() - fs.statSync(file).mtimeMs < MAX_AGE_MS;

  if (fresh) {
    const body = fs.readFileSync(file, 'utf8');
    const target = new URL(url).href;
    const matcher = (u: URL) => u.href === target;
    // charset=utf-8 is required: HN's markup has no <meta charset>, so without it the browser decodes
    // the UTF-8 body as latin1 and en-dashes etc. render as mojibake ("â€"").
    const handler = (route: import('playwright').Route) =>
      route.fulfill({ contentType: 'text/html; charset=utf-8', body });
    await page.route(matcher, handler);
    await page.goto(url, { waitUntil: 'networkidle' });
    // Drop the route once the document is served so it can't shadow a later navigation on the same page.
    await page.unroute(matcher, handler);
    return;
  }

  const response = await page.goto(url, { waitUntil: 'networkidle' });
  if (!response?.ok()) {
    throw new Error(`Failed to load ${url}: HTTP ${response?.status() ?? 'no response'}`);
  }
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(file, await page.content(), 'utf8');
}
