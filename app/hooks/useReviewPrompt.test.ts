import { describe, expect, it } from 'vitest';

import { REVIEW_PROMPT_DAYS, REVIEW_PROMPT_SORTS } from '~app/constants';

import { shouldPrompt } from './useReviewPrompt';

const MS_PER_DAY = 86_400_000;

describe('shouldPrompt', () => {
  it('returns false when dismissed', () => {
    const installTs = Date.now() - REVIEW_PROMPT_DAYS * MS_PER_DAY - 1;
    expect(shouldPrompt(true, installTs, REVIEW_PROMPT_SORTS + 1)).toBe(false);
  });

  it('returns false when install timestamp is 0 (not yet set)', () => {
    expect(shouldPrompt(false, 0, 100)).toBe(false);
  });

  it('returns true when days threshold met', () => {
    const installTs = Date.now() - REVIEW_PROMPT_DAYS * MS_PER_DAY - 1;
    expect(shouldPrompt(false, installTs, 0)).toBe(true);
  });

  it('returns false when just under days threshold', () => {
    const installTs = Date.now() - (REVIEW_PROMPT_DAYS - 1) * MS_PER_DAY;
    expect(shouldPrompt(false, installTs, 0)).toBe(false);
  });

  it('returns true when sort count threshold met', () => {
    const installTs = Date.now(); // just installed
    expect(shouldPrompt(false, installTs, REVIEW_PROMPT_SORTS)).toBe(true);
  });

  it('returns false when just under sort count threshold', () => {
    const installTs = Date.now();
    expect(shouldPrompt(false, installTs, REVIEW_PROMPT_SORTS - 1)).toBe(false);
  });

  it('returns true when both thresholds met', () => {
    const installTs = Date.now() - REVIEW_PROMPT_DAYS * MS_PER_DAY - 1;
    expect(shouldPrompt(false, installTs, REVIEW_PROMPT_SORTS + 10)).toBe(true);
  });
});
