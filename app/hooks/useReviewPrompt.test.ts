import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createStorageMock } from '~app/__fixtures__/testHelpers';
import { REVIEW_PROMPT_DAYS, REVIEW_PROMPT_SORTS, SETTINGS_KEYS } from '~app/constants';

const MS_PER_DAY = 86_400_000;

const { store, mockSet, reset, StorageClass } = createStorageMock();
vi.mock('@plasmohq/storage', () => ({ Storage: StorageClass }));

const { shouldPrompt, useReviewPrompt } = await import('./useReviewPrompt');

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
  beforeEach(() => {
    vi.clearAllMocks();
    reset();
  });

  it('sets install timestamp on first run', async () => {
    renderHook(() => useReviewPrompt());
    await act(() => Promise.resolve());

    expect(mockSet).toHaveBeenCalledWith(SETTINGS_KEYS.INSTALL_TIMESTAMP, expect.any(Number));
  });

  it('does not overwrite existing install timestamp', async () => {
    store[SETTINGS_KEYS.INSTALL_TIMESTAMP] = 1000;

    renderHook(() => useReviewPrompt());
    await act(() => Promise.resolve());

    expect(mockSet).not.toHaveBeenCalledWith(SETTINGS_KEYS.INSTALL_TIMESTAMP, expect.any(Number));
  });

  it('showPrompt is true when thresholds met', async () => {
    store[SETTINGS_KEYS.INSTALL_TIMESTAMP] = Date.now() - REVIEW_PROMPT_DAYS * MS_PER_DAY - 1;
    store[SETTINGS_KEYS.REVIEW_DISMISSED] = false;
    store[SETTINGS_KEYS.SORT_COUNT] = 0;

    const { result } = renderHook(() => useReviewPrompt());
    await act(() => Promise.resolve());

    expect(result.current.showPrompt).toBe(true);
  });

  it('showPrompt stays false when dismissed', async () => {
    store[SETTINGS_KEYS.INSTALL_TIMESTAMP] = Date.now() - REVIEW_PROMPT_DAYS * MS_PER_DAY - 1;
    store[SETTINGS_KEYS.REVIEW_DISMISSED] = true;
    store[SETTINGS_KEYS.SORT_COUNT] = 100;

    const { result } = renderHook(() => useReviewPrompt());
    await act(() => Promise.resolve());

    expect(result.current.showPrompt).toBe(false);
  });

  it('incrementSortCount writes to storage', async () => {
    store[SETTINGS_KEYS.INSTALL_TIMESTAMP] = Date.now();
    store[SETTINGS_KEYS.SORT_COUNT] = 5;

    const { result } = renderHook(() => useReviewPrompt());
    await act(() => Promise.resolve());

    act(() => result.current.incrementSortCount());

    expect(mockSet).toHaveBeenCalledWith(SETTINGS_KEYS.SORT_COUNT, 6);
  });

  it('dismissPrompt sets dismissed in storage and hides prompt', async () => {
    store[SETTINGS_KEYS.INSTALL_TIMESTAMP] = Date.now() - REVIEW_PROMPT_DAYS * MS_PER_DAY - 1;
    store[SETTINGS_KEYS.REVIEW_DISMISSED] = false;

    const { result } = renderHook(() => useReviewPrompt());
    await act(() => Promise.resolve());

    expect(result.current.showPrompt).toBe(true);

    act(() => result.current.dismissPrompt());

    expect(result.current.showPrompt).toBe(false);
    expect(mockSet).toHaveBeenCalledWith(SETTINGS_KEYS.REVIEW_DISMISSED, true);
  });
});
