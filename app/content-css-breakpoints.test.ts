// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { SORT_OPTIONS } from '~app/constants';

// A sort with an enableKey can be switched off (useSettings follows the same keys); every other
// sort is always on, so enabledSortOptions.length ranges over
// [SORT_OPTIONS.length - toggles, SORT_OPTIONS.length]. content.css must carry one word<->letter
// AND one letter<->dropdown @media block per reachable count, or the responsive menu silently
// stops collapsing at some option count and pushes HN's own header nav onto a second line.
const css = readFileSync(join(__dirname, '..', 'entrypoints', 'hn-sort.content', 'content.css'), 'utf8');

describe('content.css count-aware breakpoints', () => {
  const maxCount = SORT_OPTIONS.length;
  const minCount = SORT_OPTIONS.filter((option) => !option.enableKey).length;
  const counts = Array.from({ length: maxCount - minCount + 1 }, (_, i) => minCount + i);

  it.each(counts)("has a word<->letter block for data-sort-count='%i'", (n) => {
    expect(css).toMatch(new RegExp(`#hns-control-panel\\[data-sort-count='${n}'\\]\\s+\\.hns-btn-text`));
  });

  it.each(counts)("has a letter<->dropdown block for data-sort-count='%i'", (n) => {
    expect(css).toMatch(new RegExp(`#hns-control-panel\\[data-sort-count='${n}'\\]\\s+\\.hns-buttons-tier`));
  });
});
