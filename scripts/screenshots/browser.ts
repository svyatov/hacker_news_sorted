import path from 'path';
import type { Browser, Page } from 'playwright';
import { chromium } from 'playwright';

import { CONTROL_PANEL_ROOT_ID, CSS_CLASSES, HN_SELECTORS } from '~app/constants';

import { VARIANTS } from './constants';
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

async function showNewPostIndicators(page: Page): Promise<void> {
  await page.evaluate(
    ({ tableBodySelector, showNewClass, newPostClass }) => {
      const tbody = document.querySelector(tableBodySelector);
      if (!tbody) return;

      tbody.classList.add(showNewClass);

      // Mark a scattered subset of title rows as new posts
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

export async function captureVariants(page: Page): Promise<void> {
  for (const variant of VARIANTS) {
    await removeOverlays(page);
    await removeNewPostIndicators(page);

    if (variant.showNewPosts) {
      await showNewPostIndicators(page);
    }

    await page.click(`#${CONTROL_PANEL_ROOT_ID} [data-sort="${variant.sort}"]`);
    await page.waitForTimeout(100);

    await injectOverlayCard(page, variant.title, variant.subtitle, variant.titleNote);

    if (!variant.hideArrow) {
      const arrowTarget = `#${CONTROL_PANEL_ROOT_ID} [data-sort="${variant.sort}"]`;
      await injectArrow(page, arrowTarget);
    }

    const screenshotPath = path.join(SCREENSHOTS_DIR, variant.filename);
    await page.screenshot({ path: screenshotPath });
    console.log(`Saved: ${variant.filename}`);
  }
}

async function removeNewPostIndicators(page: Page): Promise<void> {
  await page.evaluate(
    ({ tableBodySelector, showNewClass, newPostClass }) => {
      const tbody = document.querySelector(tableBodySelector);
      if (!tbody) return;

      tbody.classList.remove(showNewClass);
      for (const row of tbody.querySelectorAll(`.${newPostClass}`)) {
        row.classList.remove(newPostClass);
      }
    },
    {
      tableBodySelector: HN_SELECTORS.TABLE_BODY,
      showNewClass: CSS_CLASSES.SHOW_NEW,
      newPostClass: CSS_CLASSES.NEW_POST,
    },
  );
}
