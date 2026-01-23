import type { Page } from 'playwright';

import { ARROW_STYLES, OVERLAY_STYLES, SCREENSHOT_IDS } from './constants';

export async function removeOverlays(page: Page): Promise<void> {
  await page.evaluate((ids) => {
    document.querySelector(`#${ids.OVERLAY}`)?.remove();
    document.querySelector(`#${ids.ARROW}`)?.remove();
    document.querySelector(`#${ids.COMPACT_OVERRIDE}`)?.remove();
  }, SCREENSHOT_IDS);
}

export async function injectOverlayCard(page: Page, title: string, subtitle: string): Promise<void> {
  await page.evaluate(
    ({ id, styles, title, subtitle }) => {
      const overlay = document.createElement('div');
      overlay.id = id;
      overlay.style.cssText = styles.CARD;

      const titleEl = document.createElement('div');
      titleEl.style.cssText = styles.TITLE;
      titleEl.textContent = title;
      overlay.appendChild(titleEl);

      const subtitleEl = document.createElement('div');
      subtitleEl.style.cssText = styles.SUBTITLE;
      subtitleEl.textContent = subtitle;
      overlay.appendChild(subtitleEl);

      document.body.appendChild(overlay);
    },
    { id: SCREENSHOT_IDS.OVERLAY, styles: OVERLAY_STYLES, title, subtitle },
  );
}

export async function injectArrow(page: Page, targetSelector: string): Promise<void> {
  await page.evaluate(
    ({ selector, ids, styles }) => {
      const target = document.querySelector(selector) as HTMLElement;
      const overlay = document.querySelector(`#${ids.OVERLAY}`) as HTMLElement;
      if (!target || !overlay) return;

      const targetRect = target.getBoundingClientRect();
      const overlayRect = overlay.getBoundingClientRect();

      const endX = targetRect.left + targetRect.width / 2;
      const endY = targetRect.bottom + 10;

      const startX = overlayRect.right - 100;
      const startY = overlayRect.top;

      const baseLeft = { x: startX - styles.BASE_WIDTH, y: startY };
      const baseRight = { x: startX + styles.BASE_WIDTH, y: startY };

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = ids.ARROW;
      svg.setAttribute('width', String(window.innerWidth));
      svg.setAttribute('height', String(window.innerHeight));
      svg.style.cssText = styles.SVG;

      const fill = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      fill.setAttribute('d', `M ${baseLeft.x} ${baseLeft.y} L ${endX} ${endY} L ${baseRight.x} ${baseRight.y} Z`);
      fill.setAttribute('fill', styles.FILL);
      svg.appendChild(fill);

      const borderLeft = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      borderLeft.setAttribute('x1', String(baseLeft.x));
      borderLeft.setAttribute('y1', String(baseLeft.y));
      borderLeft.setAttribute('x2', String(endX));
      borderLeft.setAttribute('y2', String(endY));
      borderLeft.setAttribute('stroke', styles.STROKE);
      borderLeft.setAttribute('stroke-width', styles.STROKE_WIDTH);
      svg.appendChild(borderLeft);

      const borderRight = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      borderRight.setAttribute('x1', String(baseRight.x));
      borderRight.setAttribute('y1', String(baseRight.y));
      borderRight.setAttribute('x2', String(endX));
      borderRight.setAttribute('y2', String(endY));
      borderRight.setAttribute('stroke', styles.STROKE);
      borderRight.setAttribute('stroke-width', styles.STROKE_WIDTH);
      svg.appendChild(borderRight);

      document.body.appendChild(svg);
    },
    { selector: targetSelector, ids: SCREENSHOT_IDS, styles: ARROW_STYLES },
  );
}
