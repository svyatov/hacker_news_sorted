import { execFileSync } from 'child_process';
import path from 'path';
import type { Browser, BrowserContext, Page } from 'playwright';
import { chromium } from 'playwright';

import { CONTROL_PANEL_ROOT_ID, CSS_CLASSES, HN_SELECTORS } from '~app/constants';

import { injectChromeStoragePolyfill } from './screenshots/chromePolyfill';
import { injectCommentsBundle, markUser } from './screenshots/comments';
import {
  COMMENT_MARK_USER,
  COMMENT_THREAD_ID,
  REAL_BROWSER_CONTEXT,
  REAL_BROWSER_LAUNCH,
} from './screenshots/constants';
import { gotoCached } from './screenshots/htmlCache';
import { CSS_PATH, JS_PATH, SCREENSHOTS_DIR } from './screenshots/paths';

// Viewport calculated so crop = exactly 3840×2160 (4K 16:9):
// HN uses <table width="85%">, so 3840 / 0.85 ≈ 4518
const VIEWPORT = { width: 4518, height: 2160 };
// Page zoom for HN's header + base layout. Effective layout width = VIEWPORT / ZOOM ≈ 4518 / 3.2 =
// 1412px; the full-word menu is force-shown (injectExtension) and HN's header keeps it on one line at
// this width (~200px of slack). The post list is enlarged on top of this (CONTENT_ZOOM). #hnmain's
// physical width is zoom-independent (85% of the viewport), so the 3840 crop is unaffected by ZOOM.
const ZOOM = 3.2;
const OVERLAY_ID = 'hns-demo-overlay';
// Single merged comment slide: one label for both the auto OP badge and the marked-user tint.
const COMMENT_LABEL = 'OP & custom user comment highlighting';
// CSS px from viewport edge to crop edge (right side)
const CROP_MARGIN_CSS = Math.ceil((VIEWPORT.width - 3840) / 2 / ZOOM);
// #hnmain's layout (CSS) width at the page zoom above (HN's table is 85% of the viewport).
const HNMAIN_CSS_WIDTH = Math.round((0.85 * VIEWPORT.width) / ZOOM);
// Extra zoom applied to the post list / comment tree only — NOT the header, so the full-word sort menu
// keeps its one-line fit. On-screen content size = ZOOM × CONTENT_ZOOM (≈ 4.8×), held constant while
// ZOOM was nudged up to enlarge the header. Bigger text keeps the demo legible when the 4K video is
// viewed small (the README GIF); fewer rows fit per frame, which is the intent. Content is width-capped
// to HNMAIN_CSS_WIDTH / CONTENT_ZOOM so the scaled table refills #hnmain (no overflow).
const CONTENT_ZOOM = 1.5;

async function setupBrowserWithVideo(): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
  const browser = await chromium.launch(REAL_BROWSER_LAUNCH);
  const context = await browser.newContext({
    ...REAL_BROWSER_CONTEXT,
    viewport: VIEWPORT,
    recordVideo: { dir: '/tmp/hns-demo', size: VIEWPORT },
  });
  const page = await context.newPage();
  await injectChromeStoragePolyfill(page);
  return { browser, context, page };
}

async function injectExtension(page: Page): Promise<void> {
  await gotoCached(page, 'https://news.ycombinator.com');
  await page.addStyleTag({ path: CSS_PATH });
  await page.addScriptTag({ path: JS_PATH });
  await page.waitForSelector(`#${CONTROL_PANEL_ROOT_ID}`, { timeout: 5000 });
  await page.evaluate((zoom) => {
    document.body.style.margin = '0';
    document.documentElement.style.zoom = String(zoom);
  }, ZOOM);
  // Force the full-word menu tier (words on, single letters off) regardless of how the
  // media query reads the zoomed layout width — 1506px effective is above the 1440 floor,
  // so this just makes the intent explicit and deterministic.
  await page.addStyleTag({
    content: '.hns-btn-text { display: inline !important; } .hns-btn-shortcut { display: none !important; }',
  });
  await enlargeContent(page, ['#hnmain #bigbox > td > table']);
}

// Enlarge content below the header (post list / comment tree) without touching the sort menu, which
// must stay on one line. Each table is width-capped so scaling it by CONTENT_ZOOM refills #hnmain.
async function enlargeContent(page: Page, selectors: string[]): Promise<void> {
  await page.evaluate(
    ({ selectors, contentZoom, width }) => {
      for (const sel of selectors) {
        const el = document.querySelector<HTMLElement>(sel);
        if (el) {
          el.style.width = `${Math.floor(width / contentZoom)}px`;
          el.style.zoom = String(contentZoom);
        }
      }
    },
    { selectors, contentZoom: CONTENT_ZOOM, width: HNMAIN_CSS_WIDTH },
  );
}

async function showNewPostIndicators(page: Page): Promise<void> {
  await page.evaluate(
    ({ tableBodySelector, showNewClass, newPostClass }) => {
      const tbody = document.querySelector(tableBodySelector);
      if (!tbody) return;

      tbody.classList.add(showNewClass);

      const titleRows = tbody.querySelectorAll(':scope > tr:nth-child(3n+1)');
      const indices = [0, 2, 3, 6, 8, 11];
      for (const i of indices) {
        titleRows[i]?.classList.add(newPostClass);
      }
    },
    {
      tableBodySelector: HN_SELECTORS.TABLE_BODY,
      showNewClass: CSS_CLASSES.SHOW_NEW,
      newPostClass: CSS_CLASSES.NEW_POST,
    },
  );
}

async function injectLabel(page: Page, text: string): Promise<void> {
  await page.evaluate(
    ({ id, text, margin }) => {
      document.querySelector(`#${id}`)?.remove();

      const label = document.createElement('div');
      label.id = id;
      Object.assign(label.style, {
        position: 'fixed',
        top: '40px',
        right: `${margin + 16}px`,
        background: 'rgba(0, 0, 0, 0.8)',
        color: '#fff',
        padding: '24px 60px',
        borderRadius: '18px',
        fontSize: '42px',
        fontWeight: '600',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        zIndex: '99999',
        borderLeft: '7px solid #ff6600',
      });
      label.textContent = text;

      document.body.appendChild(label);
    },
    { id: OVERLAY_ID, text, margin: CROP_MARGIN_CSS },
  );
}

type DemoStep = {
  sort?: string;
  label: string;
  pause: number;
};

const STEPS: DemoStep[] = [
  { label: 'New Post Indicators', pause: 2000 },
  { sort: 'points', label: 'Sort by Points', pause: 2000 },
  { sort: 'time', label: 'Sort by Time', pause: 2000 },
  { sort: 'comments', label: 'Sort by Comments', pause: 2000 },
  { sort: 'velocity', label: 'Sort by Velocity', pause: 2000 },
  { sort: 'heat', label: 'Sort by Heat', pause: 2000 },
  { sort: 'default', label: 'Default Order', pause: 2000 },
];

async function recordDemo(page: Page): Promise<void> {
  for (const step of STEPS) {
    if (step.sort) {
      await page.click(`#${CONTROL_PANEL_ROOT_ID} [data-sort="${step.sort}"]`);
    }
    // injectLabel swaps the pill in place (removes any existing one first), so the list reorders and the
    // label changes together — each slide runs exactly its `pause`, with no inter-slide gap or extra waits.
    await injectLabel(page, step.label);
    await page.waitForTimeout(step.pause);
  }

  // Leave the final "Default Order" label up: main() hard-cuts from here straight to the comment slide,
  // so this is a bubble-to-bubble cut — removing the label would flash an unlabeled homepage frame first.
  await page.waitForTimeout(200);
}

// Mid-recording jump to the curated thread: shows the auto OP badge, then a user becoming marked.
// Reuses the homepage-computed crop (KTD3) after asserting the item page shares the #hnmain x-bound.
// Returns the video timestamp (seconds from recordingStart) of the first fully-rendered comment frame.
// main() cuts everything between the homepage and this point, so the item-page load never appears.
async function recordCommentSegment(page: Page, cropX: number, recordingStart: number): Promise<number> {
  // Cover the item page from first paint until it's fully set up + highlighted, so the recording never
  // shows the raw load, the zoom/enlarge reflows, or the highlight popping in (the "loading blink").
  // The cover carries the slide label from the start, so the load reads as an intentional title card,
  // not a blank/missing slide. Beige (#f6f6ef) matches HN's background for a clean cut. Zoom is applied
  // here too so the label renders at final size during the load instead of snapping when zoom lands.
  await page.addInitScript(
    ({ zoom, margin, labelId, text }) => {
      const build = () => {
        document.documentElement.style.zoom = String(zoom);
        const cover = document.createElement('div');
        cover.id = 'hns-blink-cover';
        // pointer-events:none so markUser's click reaches the (visually covered) mark dot underneath.
        cover.style.cssText = 'position:fixed;inset:0;background:#f6f6ef;z-index:2147483646;pointer-events:none';
        document.documentElement.appendChild(cover);
        // Label lives above the cover (and outside it) so lifting the cover leaves it in place — the
        // same pill the other slides use, so the reveal is a seamless continuation of the title card.
        const label = document.createElement('div');
        label.id = labelId;
        label.textContent = text;
        label.style.cssText =
          `position:fixed;top:40px;right:${margin + 16}px;background:rgba(0,0,0,0.8);color:#fff;` +
          `padding:24px 60px;border-radius:18px;font-size:42px;font-weight:600;` +
          `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;` +
          `z-index:2147483647;border-left:7px solid #ff6600`;
        document.documentElement.appendChild(label);
      };
      // At document-start <html> may not exist yet; build as soon as it does, before body paints.
      if (document.documentElement) build();
      else
        new MutationObserver((_, o) => document.documentElement && (o.disconnect(), build())).observe(document, {
          childList: true,
        });
    },
    { zoom: ZOOM, margin: CROP_MARGIN_CSS, labelId: OVERLAY_ID, text: COMMENT_LABEL },
  );
  await gotoCached(page, `https://news.ycombinator.com/item?id=${COMMENT_THREAD_ID}`);
  await page.evaluate((zoom) => {
    document.body.style.margin = '0';
    document.documentElement.style.zoom = String(zoom);
  }, ZOOM);
  await injectCommentsBundle(page);
  await enlargeContent(page, ['table.fatitem', 'table.comment-tree']);

  const itemX = await page.evaluate(() => {
    const el = document.querySelector('#hnmain');
    return el ? Math.floor(el.getBoundingClientRect().x) : null;
  });
  if (itemX === null) throw new Error('#hnmain not found on item page');
  if (Math.abs(itemX - cropX) > 40) {
    throw new Error(`Item-page #hnmain x=${itemX} diverges from homepage crop x=${cropX}; crop cannot be reused`);
  }

  // Scroll the marked user's comment to the top so it and the OP comment below it fall in the crop band.
  await page.evaluate((user) => {
    const row = Array.from(document.querySelectorAll('tr.athing.comtr[id]')).find(
      (r) => r.querySelector('.comhead .hnuser')?.textContent?.trim() === user,
    );
    row?.scrollIntoView({ block: 'start' });
    window.scrollBy(0, -30);
  }, COMMENT_MARK_USER);
  await page.waitForTimeout(200);

  // Pre-apply the mark while still covered, so the reveal already shows the OP badge AND the marked user
  // together — it's a demo of the end state, no need to animate the click. (Cover is pointer-events:none
  // so the click reaches the covered dot.)
  await markUser(page, COMMENT_MARK_USER);

  // Lift the cover so the label + both highlights appear together in one frame.
  await page.evaluate(() => document.getElementById('hns-blink-cover')?.remove());
  // First kept frame. +0.4s margin so the cut never lands on a covered/reflow frame (Date.now vs.
  // video-PTS drift is well under this). Hold 2700 so ~2000ms is kept after the margin + close overhead,
  // matching the homepage slides. Label stays up to the end (video end / GIF loop), like every slide.
  const revealStartSec = (Date.now() - recordingStart) / 1000 + 0.4;
  await page.waitForTimeout(2700);
  return revealStartSec;
}

async function getContentBounds(page: Page): Promise<{ x: number; y: number; w: number; h: number }> {
  // getBoundingClientRect() with CSS zoom already returns physical pixel coordinates
  const x = await page.evaluate(() => {
    const el = document.querySelector('#hnmain');
    if (!el) return null;
    return Math.floor(el.getBoundingClientRect().x);
  });
  if (x === null) throw new Error('#hnmain not found for crop measurement');
  const w = 3840;
  const h = 2160;
  if (x + w > VIEWPORT.width || h > VIEWPORT.height) {
    throw new Error(`Crop ${w}x${h} at x=${x} exceeds viewport ${VIEWPORT.width}x${VIEWPORT.height}`);
  }
  return { x, y: 0, w, h };
}

async function main() {
  console.log('Recording demo...');
  const { browser, context, page } = await setupBrowserWithVideo();

  const recordingStart = Date.now();
  await injectExtension(page);
  // Extension defaults to 'points' sort — reset to default order before recording
  await page.click(`#${CONTROL_PANEL_ROOT_ID} [data-sort="default"]`);
  await page.waitForTimeout(150);
  await showNewPostIndicators(page);
  const loadSeconds = ((Date.now() - recordingStart) / 1000).toFixed(2);
  console.log(`Page loaded in ${loadSeconds}s — trimming that from the video.`);

  const crop = await getContentBounds(page);
  console.log(`Content bounds: ${crop.w}x${crop.h} at (${crop.x}, ${crop.y})`);
  const cropFilter = `crop=${crop.w}:${crop.h}:${crop.x}:${crop.y}`;

  await recordDemo(page);
  const homepageEndSec = ((Date.now() - recordingStart) / 1000).toFixed(2);
  const revealStartSec = (await recordCommentSegment(page, crop.x, recordingStart)).toFixed(2);

  await page.close();
  const videoPath = await page.video()?.path();
  await context.close();
  await browser.close();

  if (!videoPath) throw new Error('No video recorded');

  const mp4Path = path.join(SCREENSHOTS_DIR, 'demo.mp4');
  const gifPath = path.join(SCREENSHOTS_DIR, 'demo.gif');

  // Keep two spans and concat them, dropping the item-page load in between so the demo cuts straight
  // from the homepage to the finished comment view — no blank/beige transition frames. Span A trims the
  // initial page load off the head; span B starts at the first fully-rendered comment frame.
  const keep =
    `[0:v]trim=start=${loadSeconds}:end=${homepageEndSec},setpts=PTS-STARTPTS[a];` +
    `[0:v]trim=start=${revealStartSec},setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1[c]`;

  console.log('Converting to MP4...');
  execFileSync('ffmpeg', [
    '-y',
    '-i',
    videoPath,
    '-filter_complex',
    `${keep};[c]${cropFilter}[out]`,
    '-map',
    '[out]',
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-pix_fmt',
    'yuv420p',
    '-crf',
    '18',
    mp4Path,
  ]);

  console.log('Converting to GIF (960px wide for Retina)...');
  execFileSync('ffmpeg', [
    '-y',
    '-i',
    videoPath,
    '-filter_complex',
    `${keep};[c]${cropFilter},fps=12,scale=960:-2,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse[out]`,
    '-map',
    '[out]',
    gifPath,
  ]);

  console.log(`Done! Output:\n  ${mp4Path}\n  ${gifPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
