import type { VariantConfig } from './types';

export const SCREENSHOT_IDS = {
  OVERLAY: 'hns-screenshot-overlay',
  ARROW: 'hns-screenshot-arrow',
  COMPACT_OVERRIDE: 'hns-compact-override',
} as const;

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
    'max-width: 560px',
  ].join('; '),
  TITLE: 'font-size: 36px; font-weight: 700; color: #1a1a1a; margin-bottom: 12px;',
  SUBTITLE: 'font-size: 28px; font-weight: 400; color: #666;',
} as const;

export const ARROW_STYLES = {
  SVG: 'position: fixed; top: 0; left: 0; z-index: 10000; pointer-events: none;',
  FILL: '#ffffff',
  STROKE: 'rgba(0,0,0,0.08)',
  STROKE_WIDTH: '1',
  BASE_WIDTH: 24,
} as const;

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
    sort: 'default',
    title: 'Default Order',
    subtitle: "Back to HN's original ranking",
    filename: 'screen_by_default.png',
  },
  {
    sort: 'default',
    title: 'Compact Mode',
    subtitle: 'Keyboard shortcuts on smaller screens',
    filename: 'screen_responsive.png',
    forceCompact: true,
  },
];
