import path from 'node:path';
import type { Browser, Page } from 'playwright';
import { chromium } from 'playwright';

import { CONTROL_PANEL_ROOT_ID, CSS_CLASSES, HN_SELECTORS } from '~app/constants';

import { injectChromeStoragePolyfill } from './chromePolyfill';
import { injectCommentsBundle, markUser } from './comments';
import { REAL_BROWSER_CONTEXT, REAL_BROWSER_LAUNCH, VARIANTS } from './constants';
import { gotoCached } from './htmlCache';
import { injectArrow, injectOverlayCard, removeOverlays } from './overlays';
import { CSS_PATH, JS_PATH, SCREENSHOTS_DIR } from './paths';
import type { VariantConfig } from './types';

export async function setupBrowser(): Promise<{ browser: Browser; page: Page }> {
  const browser = await chromium.launch(REAL_BROWSER_LAUNCH);
  const context = await browser.newContext({ ...REAL_BROWSER_CONTEXT, viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await injectChromeStoragePolyfill(page);
  return { browser, page };
}

export async function injectExtension(page: Page): Promise<void> {
  await gotoCached(page, 'https://news.ycombinator.com');
  await page.addStyleTag({ path: CSS_PATH });
  await page.addScriptTag({ path: JS_PATH });
  await page.waitForSelector(`#${CONTROL_PANEL_ROOT_ID}`, { timeout: 5000 });

  // Fill the 1280×800 frame and make the list legible in a thumbnail:
  //  - drop HN's 15% side gutters (width="85%") and the body margin so content spans edge-to-edge;
  //  - enlarge ONLY the post-list table (bigger font, fewer rows) via `zoom`, leaving the header —
  //    and thus the sort-menu tier and the arrow's target button — untouched. The pre-zoom width is
  //    capped to VIEWPORT/zoom so the scaled table lands at exactly 1280px (no horizontal overflow).
  await page.evaluate(
    ({ listZoom, viewportWidth }) => {
      document.body.style.margin = '0';
      const main = document.querySelector<HTMLElement>('#hnmain');
      if (main) main.style.width = '100%';
      const list = document.querySelector<HTMLElement>('#hnmain #bigbox > td > table');
      if (list) {
        list.style.width = `${Math.floor(viewportWidth / listZoom)}px`;
        list.style.zoom = String(listZoom);
      }
    },
    { listZoom: 1.3, viewportWidth: 1280 },
  );
  // Force the full-word menu tier. At 1280px the 6-option media query (min-width 1440px)
  // would show single letters; a full-width header has room for the words, so show them.
  await page.addStyleTag({
    content: '.hns-btn-text { display: inline !important; } .hns-btn-shortcut { display: none !important; }',
  });
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
  // Item-page variants must run after every homepage variant: navigating to a thread drops the sort
  // panel that homepage variants click. A stable sort enforces it so VARIANTS declaration order can't.
  const ordered = [...VARIANTS].sort((a, b) => Number(Boolean(a.commentThreadId)) - Number(Boolean(b.commentThreadId)));
  for (const variant of ordered) {
    await removeOverlays(page);
    await removeNewPostIndicators(page);

    if (variant.commentThreadId) {
      await captureCommentVariant(page, variant);
      continue;
    }

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

async function captureCommentVariant(page: Page, variant: VariantConfig): Promise<void> {
  await gotoCached(page, `https://news.ycombinator.com/item?id=${variant.commentThreadId}`);
  await injectCommentsBundle(page);
  if (variant.markUser) await markUser(page, variant.markUser);

  // Match the homepage shots: fill the frame width, drop the body margin (no content zoom here —
  // the thread text is already legible and enlarging a nested comment tree risks clipping).
  await page.evaluate(() => {
    document.body.style.margin = '0';
    const main = document.querySelector<HTMLElement>('#hnmain');
    if (main) main.style.width = '100%';
  });

  await injectOverlayCard(page, variant.title, variant.subtitle, variant.titleNote);

  const screenshotPath = path.join(SCREENSHOTS_DIR, variant.filename);
  await page.screenshot({ path: screenshotPath });
  console.log(`Saved: ${variant.filename}`);
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
