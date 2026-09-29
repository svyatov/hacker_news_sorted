import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import { REVIEW_PROMPT_DAYS, REVIEW_PROMPT_SORTS, SETTINGS_KEYS } from '~app/constants';

import { shouldPrompt, useReviewPrompt } from './useReviewPrompt';

const MS_PER_DAY = 86_400_000;

const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));
// Values as Plasmo wrote them: every value a JSON string.
const store = (key: string, value: unknown) => fakeBrowser.storage.sync.set({ [key]: JSON.stringify(value) });
const stored = async (key: string) => (await fakeBrowser.storage.sync.get(key))[key];
const mount = async () => {
  const hook = renderHook(() => useReviewPrompt());
  await flush();
  return hook;
};

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
    const installTs = Date.now();
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

describe('useReviewPrompt', () => {
  it('records the install timestamp as a JSON string on first run', async () => {
    await mount();

    expect(JSON.parse((await stored(SETTINGS_KEYS.INSTALL_TIMESTAMP)) as string)).toEqual(expect.any(Number));
  });

  it('does not overwrite an existing install timestamp', async () => {
    await store(SETTINGS_KEYS.INSTALL_TIMESTAMP, 1000);

    await mount();

    expect(await stored(SETTINGS_KEYS.INSTALL_TIMESTAMP)).toBe('1000');
  });

  it('shows the prompt when the stored install timestamp is old enough', async () => {
    await store(SETTINGS_KEYS.INSTALL_TIMESTAMP, Date.now() - REVIEW_PROMPT_DAYS * MS_PER_DAY - 1);
    await store(SETTINGS_KEYS.REVIEW_DISMISSED, false);
    await store(SETTINGS_KEYS.SORT_COUNT, 0);

    const { result } = await mount();

    expect(result.current.showPrompt).toBe(true);
  });

  it('shows the prompt when the stored sort count meets the threshold', async () => {
    await store(SETTINGS_KEYS.INSTALL_TIMESTAMP, Date.now());
    await store(SETTINGS_KEYS.SORT_COUNT, REVIEW_PROMPT_SORTS);

    const { result } = await mount();

    expect(result.current.showPrompt).toBe(true);
  });

  it('keeps the prompt hidden for a stored "true" dismissal', async () => {
    await fakeBrowser.storage.sync.set({
      [SETTINGS_KEYS.INSTALL_TIMESTAMP]: JSON.stringify(Date.now() - REVIEW_PROMPT_DAYS * MS_PER_DAY - 1),
      [SETTINGS_KEYS.REVIEW_DISMISSED]: 'true',
      [SETTINGS_KEYS.SORT_COUNT]: '100',
    });

    const { result } = await mount();

    expect(result.current.showPrompt).toBe(false);
  });

  it('counts a sort on top of the stored count and writes it as a JSON string', async () => {
    await store(SETTINGS_KEYS.INSTALL_TIMESTAMP, Date.now());
    await store(SETTINGS_KEYS.SORT_COUNT, 5);
    const { result } = await mount();

    act(() => result.current.incrementSortCount());
    await flush();

    expect(await stored(SETTINGS_KEYS.SORT_COUNT)).toBe('6');
  });

  it('dismissPrompt hides the prompt and stores the dismissal as a JSON string', async () => {
    await store(SETTINGS_KEYS.INSTALL_TIMESTAMP, Date.now() - REVIEW_PROMPT_DAYS * MS_PER_DAY - 1);
    const { result } = await mount();
    expect(result.current.showPrompt).toBe(true);

    act(() => result.current.dismissPrompt());
    await flush();

    expect(result.current.showPrompt).toBe(false);
    expect(await stored(SETTINGS_KEYS.REVIEW_DISMISSED)).toBe('true');
  });
});
