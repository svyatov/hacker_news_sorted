import path from 'path';
import type { Browser, Page } from 'playwright';
import { chromium } from 'playwright';

import { CONTROL_PANEL_ROOT_ID, CSS_CLASSES } from '~app/constants';

import { SCREENSHOT_IDS, VARIANTS } from './constants';
import { injectArrow, injectOverlayCard, removeOverlays } from './overlays';
import { CSS_PATH, JS_PATH, SCREENSHOTS_DIR } from './paths';

export async function setupBrowser(): Promise<{ browser: Browser; page: Page }> {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  return { browser, page };
}

export async function injectExtension(page: Page): Promise<void> {
  await page.goto('https://news.ycombinator.com', { waitUntil: 'networkidle' });
  await page.addStyleTag({ path: CSS_PATH });
  await page.addScriptTag({ path: JS_PATH });
  await page.waitForSelector(`#${CONTROL_PANEL_ROOT_ID}`, { timeout: 5000 });
}

async function forceCompactMode(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      #${CONTROL_PANEL_ROOT_ID} .${CSS_CLASSES.BTN_TEXT} { display: none !important; }
      #${CONTROL_PANEL_ROOT_ID} .${CSS_CLASSES.BTN_SHORTCUT} { display: inline !important; }
    `,
  });
  await page.evaluate((id) => {
    const styles = document.querySelectorAll('style');
    const last = styles[styles.length - 1];
    if (last) last.id = id;
  }, SCREENSHOT_IDS.COMPACT_OVERRIDE);
}

export async function captureVariants(page: Page): Promise<void> {
  for (const variant of VARIANTS) {
    await removeOverlays(page);

    if (variant.forceCompact) {
      await forceCompactMode(page);
    }

    await page.click(`#${CONTROL_PANEL_ROOT_ID} [data-sort="${variant.sort}"]`);
    await page.waitForTimeout(100);

    await injectOverlayCard(page, variant.title, variant.subtitle);

    const arrowTarget = variant.forceCompact
      ? `#${CONTROL_PANEL_ROOT_ID}`
      : `#${CONTROL_PANEL_ROOT_ID} [data-sort="${variant.sort}"]`;
    await injectArrow(page, arrowTarget);

    const screenshotPath = path.join(SCREENSHOTS_DIR, variant.filename);
    await page.screenshot({ path: screenshotPath });
    console.log(`Saved: ${variant.filename}`);
  }
}
