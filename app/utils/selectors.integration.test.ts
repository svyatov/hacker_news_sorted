import { describe, expect, it } from 'vitest';

import { loadHNHomepage, setupDocument, setupHNHomepage } from '~app/__fixtures__/loadFixture';
import { HN_SELECTORS, SECONDS_PER_DAY, SECONDS_PER_HOUR, SECONDS_PER_MINUTE } from '~app/constants';

import { getTime } from './parsers';
import {
  getCommentsElement,
  getInfoRows,
  getPointsElement,
  getSpacerRows,
  getTableBody,
  getTimeElement,
  getTitleRows,
} from './selectors';

const UNIT_SECONDS = { minute: SECONDS_PER_MINUTE, hour: SECONDS_PER_HOUR, day: SECONDS_PER_DAY } as const;

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
  });
  it('should parse every .age title to the instant HN displays (timestamp canary)', () => {
    const html = loadHNHomepage();
    setupDocument(html);
    // Written by updateFixture.ts; the reference "now" the fixture's age texts were rendered against
    const fetchedAt = Date.parse(html.match(/^<!-- hns-fetched-at: (\S+) -->/)![1]!) / 1000;
    const rows = [...getInfoRows(getTableBody()!)].filter((row) => getTimeElement(row));

    let agreeing = 0;
    for (const row of rows) {
      const ageEl = getTimeElement(row)!;
      const text = ageEl.textContent?.trim() ?? '';
      const match = text.match(/^(\d+) (minute|hour|day)s? ago$/);
      expect(match, `age text should be "N unit(s) ago", got "${text}"`).not.toBeNull();
      const time = getTime(row);
      expect(time, `age title should parse: "${ageEl.getAttribute('title')}"`).not.toBe(0);
      const unit = UNIT_SECONDS[match![2] as keyof typeof UNIT_SECONDS];
      if (Math.abs(fetchedAt - time - Number(match![1]) * unit) <= unit) agreeing++;
    }
    // Second-chance posts show a younger text than their title timestamp, so only require a large majority.
    // A local-time bug shifts every row by the runner's UTC offset (5.5h under the pinned TZ) and fails this.
    expect(agreeing, `${agreeing}/${rows.length} rows agree with their age text`).toBeGreaterThanOrEqual(
      Math.ceil(rows.length * 0.8),
    );
  });
});
