import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import { clearBody, FAKE_NOW, getRowById, setupTableBody, store, stored } from '~app/__fixtures__/testHelpers';
import { CSS_CLASSES, SETTINGS_DEFAULTS, SETTINGS_KEYS } from '~app/constants';

import type { PostTimestamps } from './newPosts';
import { trackNewPosts } from './newPosts';

const COOLDOWN = SETTINGS_DEFAULTS[SETTINGS_KEYS.COOLDOWN];
const COOLDOWN_MS = COOLDOWN * 1000;
const POST_IDS_KEY = `${SETTINGS_KEYS.POST_IDS_PREFIX}/`;

// Drain the chained storage reads/writes of the async init.
const flush = async () => {
  for (let i = 0; i < 50; i++) await Promise.resolve();
};

const isMarked = (id: string) => getRowById(id).classList.contains(CSS_CLASSES.NEW_POST);
const fadeOf = (id: string) => getRowById(id).style.getPropertyValue('--hns-fade');
const savedTimestamps = async () => {
  const raw = (await stored(POST_IDS_KEY)) as string | undefined;
  return raw === undefined ? undefined : (JSON.parse(raw) as PostTimestamps);
};
// A change made by the popup or another tab: a JSON string, or a removal for undefined.
const emit = async (key: string, newValue: unknown) => {
  await (newValue === undefined ? fakeBrowser.storage.sync.remove(key) : store(key, newValue));
  await flush();
};

// Starts tracking with post-1 new (never seen before) and `known` already stored as -1.
const startWithNewPost = async (known = 'old-1') => {
  setupTableBody(['post-1']);
  await store(POST_IDS_KEY, { [known]: -1 });
  const dispose = trackNewPosts();
  await flush();
  return dispose;
};

describe('trackNewPosts', () => {
  let dispose: (() => void) | undefined;

  beforeEach(() => {
    clearBody();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(FAKE_NOW);
    vi.stubGlobal('location', { pathname: '/', search: '' });
  });

  afterEach(() => {
    dispose?.();
    dispose = undefined;
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('init', () => {
    it('stores every post as known and marks nothing on the first visit', async () => {
      setupTableBody(['post-1', 'post-2']);
      dispose = trackNewPosts();
      await flush();

      expect(await savedTimestamps()).toEqual({ 'post-1': -1, 'post-2': -1 });
      expect(isMarked('post-1')).toBe(false);
      expect(isMarked('post-2')).toBe(false);
    });

    it('marks a post missing from the stored set at full opacity and records its discovery time', async () => {
      setupTableBody(['post-1', 'post-2']);
      await store(POST_IDS_KEY, { 'post-1': -1 });
      dispose = trackNewPosts();
      await flush();

      expect(isMarked('post-1')).toBe(false);
      expect(isMarked('post-2')).toBe(true);
      expect(fadeOf('post-2')).toBe('1');
      expect(await savedTimestamps()).toEqual({ 'post-1': -1, 'post-2': FAKE_NOW });
    });

    it('keeps posts known from a JSON-string timestamp map and writes the map back as a JSON string', async () => {
      setupTableBody(['post-1', 'post-2']);
      await fakeBrowser.storage.sync.set({ [POST_IDS_KEY]: '{"post-1":-1,"post-2":-1}' });
      dispose = trackNewPosts();
      await flush();

      expect(isMarked('post-1')).toBe(false);
      expect(isMarked('post-2')).toBe(false);
      expect(await stored(POST_IDS_KEY)).toBe('{"post-1":-1,"post-2":-1}');
    });

    it('migrates the legacy JSON-string string[] format to a JSON-string timestamp map', async () => {
      setupTableBody(['post-1', 'post-2']);
      await fakeBrowser.storage.sync.set({ [POST_IDS_KEY]: '["post-1","post-2"]' });
      dispose = trackNewPosts();
      await flush();

      expect(isMarked('post-1')).toBe(false);
      expect(isMarked('post-2')).toBe(false);
      expect(await stored(POST_IDS_KEY)).toBe('{"post-1":-1,"post-2":-1}');
    });

    it('keeps legacy string[] ids known and still marks posts missing from the list', async () => {
      setupTableBody(['post-1', 'post-2']);
      await fakeBrowser.storage.sync.set({ [POST_IDS_KEY]: '["post-1"]' });
      dispose = trackNewPosts();
      await flush();

      expect(isMarked('post-1')).toBe(false);
      expect(isMarked('post-2')).toBe(true);
      expect(fadeOf('post-2')).toBe('1');
      expect(await savedTimestamps()).toEqual({ 'post-1': -1, 'post-2': FAKE_NOW });
    });

    it('re-applies a still-fading post at its remaining opacity', async () => {
      setupTableBody(['post-1']);
      await store(POST_IDS_KEY, { 'post-1': FAKE_NOW - COOLDOWN_MS / 2 });
      dispose = trackNewPosts();
      await flush();

      expect(isMarked('post-1')).toBe(true);
      expect(Number(fadeOf('post-1'))).toBeCloseTo(0.5);
    });

    it('keeps an expired timestamp but shows no mark', async () => {
      setupTableBody(['post-1']);
      await store(POST_IDS_KEY, { 'post-1': FAKE_NOW - COOLDOWN_MS - 1000 });
      dispose = trackNewPosts();
      await flush();

      expect(isMarked('post-1')).toBe(false);
      expect(await savedTimestamps()).toEqual({ 'post-1': FAKE_NOW - COOLDOWN_MS - 1000 });
    });

    it('only tracks story rows (tr.athing with an id)', async () => {
      const tbody = setupTableBody(['post-1']);
      const noId = document.createElement('tr');
      noId.className = 'athing';
      tbody.appendChild(noId);
      dispose = trackNewPosts();
      await flush();

      expect(Object.keys((await savedTimestamps()) ?? {})).toEqual(['post-1']);
    });

    it.each([
      ['on', true],
      ['off', false],
    ])('sets the show-new class on the table body when the setting is %s', async (_, enabled) => {
      const tbody = setupTableBody(['post-1']);
      await store(SETTINGS_KEYS.SHOW_NEW, enabled);
      dispose = trackNewPosts();
      await flush();

      expect(tbody.classList.contains(CSS_CLASSES.SHOW_NEW)).toBe(enabled);
    });

    it.each(['?p=2', '?next=123'])('does not track posts on a paginated page (%s)', async (search) => {
      vi.stubGlobal('location', { pathname: '/', search });
      setupTableBody(['post-1']);
      await store(POST_IDS_KEY, { 'old-1': -1 });
      dispose = trackNewPosts();
      await flush();

      expect(isMarked('post-1')).toBe(false);
      expect(await savedTimestamps()).toEqual({ 'old-1': -1 });
    });

    it('does nothing when the table body is missing', async () => {
      await store(POST_IDS_KEY, { 'old-1': -1 });
      dispose = trackNewPosts();
      await flush();

      await emit(SETTINGS_KEYS.SHOW_NEW, false);

      expect(await savedTimestamps()).toEqual({ 'old-1': -1 });
    });

    it('leaves posts unmarked when storage reads reject', async () => {
      // An invalidated extension context fails every read: both settings and the post ids.
      vi.spyOn(fakeBrowser.storage.sync, 'get').mockRejectedValue(new Error('Extension context invalidated.'));
      setupTableBody(['post-1']);
      await store(POST_IDS_KEY, { 'old-1': -1 });
      dispose = trackNewPosts();
      await flush();

      expect(isMarked('post-1')).toBe(false);
      vi.restoreAllMocks();
      expect(await savedTimestamps()).toEqual({ 'old-1': -1 });
    });
  });

  describe('fading', () => {
    it('lowers the opacity as the cooldown elapses', async () => {
      dispose = await startWithNewPost();
      expect(fadeOf('post-1')).toBe('1');

      vi.advanceTimersByTime(COOLDOWN_MS / 2);

      expect(Number(fadeOf('post-1'))).toBeCloseTo(0.5, 1);
    });

    it('removes the mark once the cooldown expires', async () => {
      dispose = await startWithNewPost();

      vi.advanceTimersByTime(COOLDOWN_MS + 1000);

      expect(isMarked('post-1')).toBe(false);
      expect(fadeOf('post-1')).toBe('');
    });

    it('leaves known posts alone while a new one fades', async () => {
      setupTableBody(['post-1', 'post-2']);
      await store(POST_IDS_KEY, { 'post-2': -1 });
      dispose = trackNewPosts();
      await flush();

      vi.advanceTimersByTime(COOLDOWN_MS / 2);

      expect(isMarked('post-2')).toBe(false);
      expect(fadeOf('post-2')).toBe('');
    });

    it('keeps fading after a marked row leaves the page', async () => {
      dispose = await startWithNewPost();
      getRowById('post-1').remove();

      expect(() => vi.advanceTimersByTime(COOLDOWN_MS / 2)).not.toThrow();
    });

    it('stops fading after dispose', async () => {
      const stop = await startWithNewPost();
      stop();

      vi.advanceTimersByTime(COOLDOWN_MS / 2);

      expect(fadeOf('post-1')).toBe('1');
    });

    it('does not start a fade timer when no post is new', async () => {
      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
      dispose = await startWithNewPost('post-1');

      expect(setIntervalSpy).not.toHaveBeenCalled();
    });
  });

  describe('cooldown changes', () => {
    it('fades against the new cooldown', async () => {
      dispose = await startWithNewPost();

      await emit(SETTINGS_KEYS.COOLDOWN, COOLDOWN * 2);
      vi.advanceTimersByTime(COOLDOWN_MS);

      expect(Number(fadeOf('post-1'))).toBeCloseTo(0.5, 1);
    });

    it('reads a JSON-string cooldown change: "15" as 15 seconds', async () => {
      dispose = await startWithNewPost();

      await fakeBrowser.storage.sync.set({ [SETTINGS_KEYS.COOLDOWN]: '15' });
      await flush();
      vi.advanceTimersByTime(7500);

      expect(Number(fadeOf('post-1'))).toBeCloseTo(0.5, 1);
    });

    it('falls back to the default cooldown when the setting is removed', async () => {
      dispose = await startWithNewPost();

      await emit(SETTINGS_KEYS.COOLDOWN, COOLDOWN * 2);
      await emit(SETTINGS_KEYS.COOLDOWN, undefined);
      vi.advanceTimersByTime(COOLDOWN_MS / 2);

      expect(Number(fadeOf('post-1'))).toBeCloseTo(0.5, 1);
    });

    it('revives an expired mark when the cooldown is increased', async () => {
      dispose = await startWithNewPost();
      vi.advanceTimersByTime(COOLDOWN_MS + 1000);
      expect(isMarked('post-1')).toBe(false);

      await emit(SETTINGS_KEYS.COOLDOWN, COOLDOWN * 2);

      expect(isMarked('post-1')).toBe(true);
    });

    it('does not start a fade timer when no post is new', async () => {
      dispose = await startWithNewPost('post-1');
      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');

      await emit(SETTINGS_KEYS.COOLDOWN, 120);

      expect(setIntervalSpy).not.toHaveBeenCalled();
    });

    it('does not start a fade timer while show-new is off', async () => {
      await store(SETTINGS_KEYS.SHOW_NEW, false);
      dispose = await startWithNewPost();
      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');

      await emit(SETTINGS_KEYS.COOLDOWN, 300);

      expect(setIntervalSpy).not.toHaveBeenCalled();
    });
  });

  describe('show-new changes', () => {
    it('clears the marks and the class when turned off', async () => {
      dispose = await startWithNewPost();

      await emit(SETTINGS_KEYS.SHOW_NEW, false);
      vi.advanceTimersByTime(COOLDOWN_MS / 2);

      expect(isMarked('post-1')).toBe(false);
      expect(fadeOf('post-1')).toBe('');
      expect(document.querySelector(`.${CSS_CLASSES.SHOW_NEW}`)).toBeNull();
    });

    it('reads a stored "false" as show-new off', async () => {
      await fakeBrowser.storage.sync.set({ [SETTINGS_KEYS.SHOW_NEW]: 'false' });
      dispose = await startWithNewPost();

      expect(document.querySelector(`.${CSS_CLASSES.SHOW_NEW}`)).toBeNull();
    });

    it('falls back to showing marks when the setting is removed', async () => {
      await store(SETTINGS_KEYS.SHOW_NEW, false);
      dispose = await startWithNewPost();

      await emit(SETTINGS_KEYS.SHOW_NEW, undefined);

      expect(isMarked('post-1')).toBe(true);
      expect(document.querySelector(`.${CSS_CLASSES.SHOW_NEW}`)).not.toBeNull();
    });

    it('re-marks and resumes fading when turned back on', async () => {
      dispose = await startWithNewPost();

      await emit(SETTINGS_KEYS.SHOW_NEW, false);
      await emit(SETTINGS_KEYS.SHOW_NEW, true);
      expect(isMarked('post-1')).toBe(true);

      vi.advanceTimersByTime(COOLDOWN_MS / 2);
      expect(Number(fadeOf('post-1'))).toBeCloseTo(0.5, 1);
    });
  });

  describe('post ids synced from another tab', () => {
    it('re-applies marks from a JSON-string change without writing back', async () => {
      setupTableBody(['post-1', 'post-2']);
      await store(POST_IDS_KEY, { 'post-1': -1, 'post-2': -1 });
      dispose = trackNewPosts();
      await flush();
      const setSpy = vi.spyOn(fakeBrowser.storage.sync, 'set');

      await fakeBrowser.storage.sync.set({ [POST_IDS_KEY]: `{"post-1":${Date.now()},"post-2":-1}` });
      await flush();

      expect(isMarked('post-1')).toBe(true);
      expect(isMarked('post-2')).toBe(false);
      // The one call is this test's own write above; a write-back from the tracker would make two.
      expect(setSpy).toHaveBeenCalledOnce();
    });

    it('does not mark posts that the other tab no longer lists', async () => {
      setupTableBody(['post-1', 'post-2']);
      await store(POST_IDS_KEY, { 'post-1': -1, 'post-2': -1 });
      dispose = trackNewPosts();
      await flush();

      // The other tab loaded after post-2 fell off the list, so its stored map lacks post-2.
      await emit(POST_IDS_KEY, { 'post-1': -1, 'post-3': Date.now() });

      expect(isMarked('post-2')).toBe(false);
    });

    it('fades marks that arrive while nothing else is fading', async () => {
      dispose = await startWithNewPost('post-1');

      await emit(POST_IDS_KEY, { 'post-1': Date.now() });
      vi.advanceTimersByTime(COOLDOWN_MS / 2);

      expect(Number(fadeOf('post-1'))).toBeCloseTo(0.5, 1);
    });

    it('keeps its own marks when another tab clears the key', async () => {
      dispose = await startWithNewPost();

      await emit(POST_IDS_KEY, undefined);

      expect(isMarked('post-1')).toBe(true);
    });

    it('accepts the legacy string[] format and keeps a known post unmarked', async () => {
      dispose = await startWithNewPost('post-1');

      await emit(POST_IDS_KEY, ['post-1']);

      expect(isMarked('post-1')).toBe(false);
    });

    it("clears this tab's mark on a post that a legacy string[] list names", async () => {
      dispose = await startWithNewPost();
      expect(isMarked('post-1')).toBe(true);

      await emit(POST_IDS_KEY, ['post-1']);

      expect(isMarked('post-1')).toBe(false);
    });

    it('ignores the first page of the same list when this is a later page', async () => {
      vi.stubGlobal('location', { pathname: '/news', search: '?p=2' });
      setupTableBody(['page2-post']);
      dispose = trackNewPosts();
      await flush();

      // Loading /news in another tab writes page 1's ids under the same pathname key.
      await emit(`${SETTINGS_KEYS.POST_IDS_PREFIX}/news`, { 'page1-post': -1 });

      expect(isMarked('page2-post')).toBe(false);
    });
  });

  describe('dispose', () => {
    it('stops watching storage', async () => {
      const stop = await startWithNewPost();
      expect(fakeBrowser.storage.sync.onChanged.hasListeners()).toBe(true);

      stop();

      expect(fakeBrowser.storage.sync.onChanged.hasListeners()).toBe(false);
    });

    it('does not start a fade timer when disposed during init', async () => {
      setupTableBody(['post-1']);
      await store(POST_IDS_KEY, { 'old-1': -1 });
      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');

      trackNewPosts()();
      await flush();

      expect(setIntervalSpy).not.toHaveBeenCalled();
    });
  });
});
