import { describe, expect, it } from 'vitest';

import { setupHNHomepage } from '~app/__fixtures__/loadFixture';
import { HN_SELECTORS } from '~app/constants';

import {
  getCommentsElement,
  getInfoRows,
  getPointsElement,
  getSpacerRows,
  getTableBody,
  getTimeElement,
  getTitleRows,
} from './selectors';

describe('selectors (integration with live HN HTML)', () => {
  it('should match all HN_SELECTORS against real HN markup', () => {
    setupHNHomepage();

    expect(
      document.querySelectorAll(HN_SELECTORS.CONTROL_PANEL_PARENT),
      'CONTROL_PANEL_PARENT should match exactly 1 element',
    ).toHaveLength(1);

    const tableBody = getTableBody();
    expect(
      document.querySelectorAll(HN_SELECTORS.TABLE_BODY),
      'TABLE_BODY should match exactly 1 element',
    ).toHaveLength(1);

    const titleRows = getTitleRows(tableBody!);
    expect(titleRows.length, 'TITLE_ROWS should return 31 rows').toBe(31);

    const infoRows = getInfoRows(tableBody!);
    expect(infoRows.length, 'INFO_ROWS should match TITLE_ROWS count').toBe(titleRows.length);

    const spacerRows = getSpacerRows(tableBody!);
    // Last post doesn't have a trailing spacer row
    expect(spacerRows.length, 'SPACER_ROWS should be less than TITLE_ROWS count by 1').toBe(titleRows.length - 1);

    const rowCount = infoRows.length;
    const minWithElement = rowCount - 5; // Allow up to 5 promo/job posts

    let pointsCount = 0;
    let timeCount = 0;
    let commentsCount = 0;

    infoRows.forEach((row) => {
      if (getPointsElement(row)) pointsCount++;
      if (getTimeElement(row)) timeCount++;
      if (getCommentsElement(row)) commentsCount++;
    });

    expect(pointsCount, `at least ${minWithElement}/${rowCount} should have POINTS`).toBeGreaterThanOrEqual(
      minWithElement,
    );
    expect(timeCount, `at least ${minWithElement}/${rowCount} should have TIME`).toBeGreaterThanOrEqual(minWithElement);
    expect(commentsCount, `at least ${minWithElement}/${rowCount} should have COMMENTS`).toBeGreaterThanOrEqual(
      minWithElement,
    );

    // Canary: validate HN's .age title attribute format ("ISO_DATETIME UNIX_TIMESTAMP")
    const titleFormatRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2} \d+$/;
    infoRows.forEach((row) => {
      const ageEl = getTimeElement(row);
      if (!ageEl) return;
      const title = ageEl.getAttribute('title');
      expect(title, 'age title should match "ISO UNIX" format').toMatch(titleFormatRegex);
    });

    // Canary: validate HN's .age text format ("X minute(s)/hour(s)/day(s) ago")
    const ageTextRegex = /^\d+ (minute|hour|day)s? ago$/;
    infoRows.forEach((row) => {
      const ageEl = getTimeElement(row);
      if (!ageEl) return;
      const text = ageEl.textContent?.trim();
      expect(text, 'age text should match "N unit(s) ago" format').toMatch(ageTextRegex);
    });
  });
});
