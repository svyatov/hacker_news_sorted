import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { SORT_OPTIONS } from '~app/constants';

// Sorts that have a disable toggle (mirror enabledSortSet in app/hooks/useSettings.ts). Every
// other sort is always on, so enabledSortOptions.length ranges over
// [SORT_OPTIONS.length - toggles, SORT_OPTIONS.length]. content.css must carry one word<->letter
// AND one letter<->dropdown @media block per reachable count, or the responsive menu silently
// stops collapsing at some option count and pushes HN's own header nav onto a second line.
const TOGGLEABLE_SORTS = ['velocity', 'heat'];

const css = readFileSync(join(__dirname, '..', 'content.css'), 'utf8');

describe('content.css count-aware breakpoints', () => {
  const maxCount = SORT_OPTIONS.length;
  const minCount = SORT_OPTIONS.length - TOGGLEABLE_SORTS.length;
  const counts = Array.from({ length: maxCount - minCount + 1 }, (_, i) => minCount + i);

  it('keeps TOGGLEABLE_SORTS in sync with SORT_OPTIONS', () => {
    const known = new Set(SORT_OPTIONS.map((option) => option.sortBy));
    for (const sort of TOGGLEABLE_SORTS) {
      expect(known.has(sort as (typeof SORT_OPTIONS)[number]['sortBy'])).toBe(true);
    }
  });

  it.each(counts)("has a word<->letter block for data-sort-count='%i'", (n) => {
    expect(css).toMatch(new RegExp(`#hns-control-panel\\[data-sort-count='${n}'\\]\\s+\\.hns-btn-text`));
  });

  it.each(counts)("has a letter<->dropdown block for data-sort-count='%i'", (n) => {
    expect(css).toMatch(new RegExp(`#hns-control-panel\\[data-sort-count='${n}'\\]\\s+\\.hns-buttons-tier`));
  });
});
