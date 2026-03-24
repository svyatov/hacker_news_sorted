import { execFileSync } from 'child_process';
import path from 'path';
import type { Browser, BrowserContext, Page } from 'playwright';
import { chromium } from 'playwright';

import { CONTROL_PANEL_ROOT_ID, CSS_CLASSES, HN_SELECTORS } from '~app/constants';

import { injectChromeStoragePolyfill } from './screenshots/chromePolyfill';
import { CSS_PATH, JS_PATH, SCREENSHOTS_DIR } from './screenshots/paths';

// Viewport calculated so crop = exactly 3840×2160 (4K 16:9):
// HN uses <table width="85%">, so 3840 / 0.85 ≈ 4518
const VIEWPORT = { width: 4518, height: 2160 };
const ZOOM = 4;
const OVERLAY_ID = 'hns-demo-overlay';
// CSS px from viewport edge to crop edge (right side)
const CROP_MARGIN_CSS = Math.ceil((VIEWPORT.width - 3840) / 2 / ZOOM);

async function setupBrowserWithVideo(): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: '/tmp/hns-demo', size: VIEWPORT },
  });
  const page = await context.newPage();
  await injectChromeStoragePolyfill(page);
  return { browser, context, page };
}

async function injectExtension(page: Page): Promise<void> {
  await page.goto('https://news.ycombinator.com', { waitUntil: 'networkidle' });
  await page.addStyleTag({ path: CSS_PATH });
  await page.addScriptTag({ path: JS_PATH });
  await page.waitForSelector(`#${CONTROL_PANEL_ROOT_ID}`, { timeout: 5000 });
  await page.evaluate((zoom) => {
    document.body.style.margin = '0';
    document.documentElement.style.zoom = String(zoom);
  }, ZOOM);
  // Force full button labels (media query doesn't fire at zoomed layout width)
  await page.addStyleTag({ content: '.hns-btn-text { display: inline !important; }' });
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
        padding: '14px 36px',
        borderRadius: '12px',
        fontSize: '24px',
        fontWeight: '600',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        zIndex: '99999',
        borderLeft: '4px solid #ff6600',
      });
      label.textContent = text;

      document.body.appendChild(label);
    },
    { id: OVERLAY_ID, text, margin: CROP_MARGIN_CSS },
  );
}

async function removeLabel(page: Page): Promise<void> {
  await page.evaluate((id) => document.querySelector(`#${id}`)?.remove(), OVERLAY_ID);
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
  { sort: 'default', label: 'Default Order', pause: 2000 },
];

async function recordDemo(page: Page): Promise<void> {
  for (const step of STEPS) {
    await removeLabel(page);
    await page.waitForTimeout(200);

    if (step.sort) {
      await page.click(`#${CONTROL_PANEL_ROOT_ID} [data-sort="${step.sort}"]`);
      await page.waitForTimeout(150);
    }

    await injectLabel(page, step.label);
    await page.waitForTimeout(step.pause);
  }

  await removeLabel(page);
  await page.waitForTimeout(500);
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

  await page.close();
  const videoPath = await page.video()?.path();
  await context.close();
  await browser.close();

  if (!videoPath) throw new Error('No video recorded');

  const mp4Path = path.join(SCREENSHOTS_DIR, 'demo.mp4');
  const gifPath = path.join(SCREENSHOTS_DIR, 'demo.gif');

  console.log('Converting to MP4...');
  execFileSync('ffmpeg', [
    '-y',
    '-ss',
    loadSeconds,
    '-i',
    videoPath,
    '-vf',
    cropFilter,
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
    '-ss',
    loadSeconds,
    '-i',
    videoPath,
    '-vf',
    `${cropFilter},fps=12,scale=960:-2,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
    gifPath,
  ]);

  console.log(`Done! Output:\n  ${mp4Path}\n  ${gifPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
