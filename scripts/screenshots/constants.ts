import type { VariantConfig } from './types';

export const SCREENSHOT_IDS = {
  OVERLAY: 'hns-screenshot-overlay',
  ARROW: 'hns-screenshot-arrow',
} as const;

// HN throttles automation on its expensive /item endpoint (429) even when the homepage loads fine,
// so the generators drive the *real* installed Google Chrome (chromium.launch({ channel: 'chrome' }))
// and present a fully self-consistent desktop-Chrome fingerprint. `channel: 'chrome'` supplies the
// genuine TLS/HTTP2 handshake and client hints; the values below strip the headless UA token and keep
// the sec-ch-ua client hints in agreement with it (a UA/hint mismatch is a classic bot tell). Bump the
// version together with the installed Chrome. Shared by both generators' launch() + newContext().
export const CHROME_MAJOR = '149';

export const REAL_BROWSER_LAUNCH = { channel: 'chrome' };

export const USER_AGENT = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROME_MAJOR}.0.0.0 Safari/537.36`;

export const REAL_BROWSER_CONTEXT = {
  userAgent: USER_AGENT,
  locale: 'en-US',
  timezoneId: 'America/New_York',
  extraHTTPHeaders: {
    'Accept-Language': 'en-US,en;q=0.9',
    'sec-ch-ua': `"Google Chrome";v="${CHROME_MAJOR}", "Chromium";v="${CHROME_MAJOR}", "Not?A_Brand";v="24"`,
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
  },
};

export const OVERLAY_STYLES = {
  CARD: [
    'position: fixed',
    'top: 33%',
    'right: 40px',
    'transform: translateY(-50%)',
    'background: #fff',
    'border-radius: 24px',
    'box-shadow: 0 8px 48px rgba(0,0,0,0.12)',
    'border-left: 8px solid #ff6600',
    'padding: 40px 56px',
    'z-index: 9999',
    "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    'max-width: 600px',
  ].join('; '),
  TITLE: 'font-size: 36px; font-weight: 700; color: #1a1a1a; margin-bottom: 12px;',
  SUBTITLE: 'font-size: 28px; font-weight: 400; color: #666;',
  TITLE_NOTE: 'font-size: 24px; font-weight: 400; color: #999;',
} as const;

export const ARROW_STYLES = {
  SVG: 'position: fixed; top: 0; left: 0; z-index: 10000; pointer-events: none;',
  FILL: '#ffffff',
  STROKE: 'rgba(0,0,0,0.08)',
  STROKE_WIDTH: '1',
  BASE_WIDTH: 24,
} as const;

// Curated item thread for the comment-highlighting shot (KTD1): story author `jaksa` has
// commented (OP badge renders) and top-comment `Z4cki` is a distinct non-OP user to mark.
// Item ids never expire; swap if it ever 404s.
export const COMMENT_THREAD_ID = '48814822';
export const COMMENT_MARK_USER = 'Z4cki';

export const VARIANTS: VariantConfig[] = [
  { sort: 'points', title: 'Sort by Points', subtitle: 'Highest voted posts first', filename: 'screen_by_points.png' },
  { sort: 'time', title: 'Sort by Time', subtitle: 'Newest posts first', filename: 'screen_by_time.png' },
  {
    sort: 'comments',
    title: 'Sort by Comments',
    subtitle: 'Most discussed first',
    filename: 'screen_by_comments.png',
  },
  {
    sort: 'velocity',
    title: 'Sort by Velocity',
    subtitle: 'The fastest-rising posts (points per hour)',
    filename: 'screen_by_velocity.png',
  },
  {
    sort: 'heat',
    title: 'Sort by Heat',
    subtitle: 'Where the debate is (comments per point)',
    filename: 'screen_by_heat.png',
  },
  {
    sort: 'default',
    title: 'Default Order',
    subtitle: "Back to HN's original ranking",
    filename: 'screen_by_default.png',
  },
  {
    sort: 'default',
    title: 'New Post Indicators',
    titleNote: '(optional)',
    subtitle: 'Orange dots mark new posts since your last visit',
    filename: 'screen_new_posts.png',
    showNewPosts: true,
    hideArrow: true,
  },
  // Item-page variant (carries commentThreadId). captureVariants sorts these to run after every
  // homepage variant, so declaration order here is free — the sort, not this position, is the guard.
  {
    sort: 'default',
    title: 'Comment Author Highlighting',
    subtitle: 'Orange OP badge on the author; tint any user you mark',
    filename: 'screen_comment_highlight.png',
    hideArrow: true,
    commentThreadId: COMMENT_THREAD_ID,
    markUser: COMMENT_MARK_USER,
  },
];
