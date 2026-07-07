import { HN_SELECTORS } from '~app/constants';

// The numeric item id from the `?id=` query param, or null on pages without one.
export const getItemId = (): string | null => new URLSearchParams(window.location.search).get('id');

// True on a canonical story page — its `.fatitem` carries a story title link. False on a
// comment-permalink page, where the `.fatitem` is a comment and has no `.titleline` (KTD-8).
export const isStoryPage = (): boolean => Boolean(document.querySelector(HN_SELECTORS.STORY_LINK));
