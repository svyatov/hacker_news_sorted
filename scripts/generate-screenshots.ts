import { readdirSync } from 'fs';
import path from 'path';
import { chromium } from 'playwright';

import { CONTROL_PANEL_ROOT_ID, CSS_CLASSES } from '~app/constants';
import type { SortVariant } from '~app/types';

// @ts-expect-error Bun-specific API
const ROOT_DIR = path.resolve(import.meta.dir, '..');
const SCREENSHOTS_DIR = path.join(ROOT_DIR, 'images');
const BUILD_DIR = path.join(ROOT_DIR, 'build/chrome-mv3-prod');

// Find built assets (filenames contain content hashes)
const buildFiles = readdirSync(BUILD_DIR);
const cssFile = buildFiles.find((f) => f.startsWith('content.') && f.endsWith('.css'));
const jsFile = buildFiles.find((f) => f.startsWith('content.') && f.endsWith('.js'));
if (!cssFile || !jsFile) throw new Error('Built assets not found. Run `bun run build` first.');

const CSS_PATH = path.join(BUILD_DIR, cssFile);
const JS_PATH = path.join(BUILD_DIR, jsFile);

type VariantConfig = {
  sort: SortVariant;
  title: string;
  subtitle: string;
  filename: string;
  forceCompact?: boolean;
};

const VARIANTS: VariantConfig[] = [
  { sort: 'points', title: 'Sort by Points', subtitle: 'Highest voted posts first', filename: 'screen_by_points.png' },
  { sort: 'time', title: 'Sort by Time', subtitle: 'Newest posts first', filename: 'screen_by_time.png' },
  {
    sort: 'comments',
    title: 'Sort by Comments',
    subtitle: 'Most discussed first',
    filename: 'screen_by_comments.png',
  },
  {
    sort: 'default',
    title: 'Default Order',
    subtitle: "Back to HN's original ranking",
    filename: 'screen_by_default.png',
  },
  {
    sort: 'default',
    title: 'Compact Mode',
    subtitle: 'Keyboard shortcuts on smaller screens',
    filename: 'screen_responsive.png',
    forceCompact: true,
  },
];

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  await page.goto('https://news.ycombinator.com', { waitUntil: 'networkidle' });

  // Inject built extension assets
  await page.addStyleTag({ path: CSS_PATH });
  await page.addScriptTag({ path: JS_PATH });

  // Wait for the control panel to be rendered by the extension
  await page.waitForSelector(`#${CONTROL_PANEL_ROOT_ID}`, { timeout: 5000 });

  for (const variant of VARIANTS) {
    // Remove previous overlay and arrow
    await page.evaluate(() => {
      document.querySelector('#hns-screenshot-overlay')?.remove();
      document.querySelector('#hns-screenshot-arrow')?.remove();
      document.querySelector('#hns-compact-override')?.remove();
    });

    // Force compact mode if needed
    if (variant.forceCompact) {
      await page.addStyleTag({
        content: `
          #${CONTROL_PANEL_ROOT_ID} .${CSS_CLASSES.BTN_TEXT} { display: none !important; }
          #${CONTROL_PANEL_ROOT_ID} .${CSS_CLASSES.BTN_SHORTCUT} { display: inline !important; }
        `,
      });
      await page.evaluate(() => {
        const styles = document.querySelectorAll('style');
        const last = styles[styles.length - 1];
        if (last) last.id = 'hns-compact-override';
      });
    }

    // Click the sort button — the extension handles sorting and highlighting
    await page.click(`#${CONTROL_PANEL_ROOT_ID} [data-sort="${variant.sort}"]`);

    // Small delay for React to re-render
    await page.waitForTimeout(100);

    // Inject overlay card
    await page.evaluate(
      ({ title, subtitle }: { title: string; subtitle: string }) => {
        const overlay = document.createElement('div');
        overlay.id = 'hns-screenshot-overlay';
        overlay.style.cssText = [
          'position: fixed',
          'top: 33%',
          'right: 40px',
          'transform: translateY(-50%)',
          'background: #fff',
          'border-radius: 24px',
          'box-shadow: 0 8px 48px rgba(0,0,0,0.12)',
          'border-left: 8px solid #ff6600',
          'padding: 40px 56px',
          'z-index: 9999',
          "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          'max-width: 560px',
        ].join('; ');

        const titleEl = document.createElement('div');
        titleEl.style.cssText = 'font-size: 36px; font-weight: 700; color: #1a1a1a; margin-bottom: 12px;';
        titleEl.textContent = title;
        overlay.appendChild(titleEl);

        const subtitleEl = document.createElement('div');
        subtitleEl.style.cssText = 'font-size: 28px; font-weight: 400; color: #666;';
        subtitleEl.textContent = subtitle;
        overlay.appendChild(subtitleEl);

        document.body.appendChild(overlay);
      },
      { title: variant.title, subtitle: variant.subtitle },
    );

    // Speech bubble tail pointing from card to the active button
    const arrowTarget = variant.forceCompact
      ? `#${CONTROL_PANEL_ROOT_ID}`
      : `#${CONTROL_PANEL_ROOT_ID} [data-sort="${variant.sort}"]`;

    await page.evaluate((selector: string) => {
      const target = document.querySelector(selector) as HTMLElement;
      const overlay = document.querySelector('#hns-screenshot-overlay') as HTMLElement;
      if (!target || !overlay) return;

      const targetRect = target.getBoundingClientRect();
      const overlayRect = overlay.getBoundingClientRect();

      const endX = targetRect.left + targetRect.width / 2;
      const endY = targetRect.bottom + 10;

      const startX = overlayRect.right - 100;
      const startY = overlayRect.top;

      const startWidth = 24;
      const baseLeft = { x: startX - startWidth, y: startY };
      const baseRight = { x: startX + startWidth, y: startY };

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'hns-screenshot-arrow';
      svg.setAttribute('width', String(window.innerWidth));
      svg.setAttribute('height', String(window.innerHeight));
      svg.style.cssText = 'position: fixed; top: 0; left: 0; z-index: 10000; pointer-events: none;';

      const fill = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      fill.setAttribute('d', `M ${baseLeft.x} ${baseLeft.y} L ${endX} ${endY} L ${baseRight.x} ${baseRight.y} Z`);
      fill.setAttribute('fill', '#ffffff');
      svg.appendChild(fill);

      const borderLeft = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      borderLeft.setAttribute('x1', String(baseLeft.x));
      borderLeft.setAttribute('y1', String(baseLeft.y));
      borderLeft.setAttribute('x2', String(endX));
      borderLeft.setAttribute('y2', String(endY));
      borderLeft.setAttribute('stroke', 'rgba(0,0,0,0.08)');
      borderLeft.setAttribute('stroke-width', '1');
      svg.appendChild(borderLeft);

      const borderRight = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      borderRight.setAttribute('x1', String(baseRight.x));
      borderRight.setAttribute('y1', String(baseRight.y));
      borderRight.setAttribute('x2', String(endX));
      borderRight.setAttribute('y2', String(endY));
      borderRight.setAttribute('stroke', 'rgba(0,0,0,0.08)');
      borderRight.setAttribute('stroke-width', '1');
      svg.appendChild(borderRight);

      document.body.appendChild(svg);
    }, arrowTarget);

    const screenshotPath = path.join(SCREENSHOTS_DIR, variant.filename);
    await page.screenshot({ path: screenshotPath });
    console.log(`Saved: ${variant.filename}`);
  }

  await browser.close();
  console.log('Done! All screenshots generated.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
