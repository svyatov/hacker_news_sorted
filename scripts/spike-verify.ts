/**
 * Spike-only runtime verification harness (branch spike/wxt — deleted on cleanup, never reaches main).
 *
 * Loads the unpacked WXT build (.output/chrome-mv3) into a REAL extension context via Playwright's
 * launchPersistentContext(--load-extension) — required so chrome.storage.sync is genuine and
 * @plasmohq/storage's extension-API guard doesn't false-RED (KTD-4/KTD-5). Navigates to HN's
 * homepage (served from the screenshot infra's daily cache to dodge 429s), then reports:
 *   - U2: the ControlPanel mounts in a shadow root (host #hns-control-panel gets data-sort-count,
 *     which only happens after React mounts + settings settle) and the sort buttons render.
 *   - U4/U5: any window.__HNS_SPIKE__ probe results the content script stashed (added in those units).
 *   - console errors / page errors observed during load.
 *
 * Exit code: 0 if the panel mounted and no page errors; 1 otherwise. Prints a JSON summary.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

import { CONTROL_PANEL_ROOT_ID } from '~app/constants';

import { REAL_BROWSER_CONTEXT } from './screenshots/constants';
import { gotoCached } from './screenshots/htmlCache';

const EXT_PATH = path.resolve('.output/chrome-mv3');
const HN_URL = 'https://news.ycombinator.com';

async function main() {
  if (!fs.existsSync(path.join(EXT_PATH, 'manifest.json'))) {
    throw new Error(`No build at ${EXT_PATH} — run \`bunx wxt build\` first.`);
  }

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hns-spike-'));
  // Use Playwright's bundled Chromium (Chrome for Testing), NOT channel:'chrome': stable Chrome 150
  // refuses --load-extension in every mode (feature gate removed), while Chrome for Testing loads
  // unpacked extensions fine. The homepage is served from cache so dropping the real-Chrome
  // fingerprint doesn't reintroduce HN 429s (only sub-resources hit live HN, which isn't throttled).
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXT_PATH}`,
      `--load-extension=${EXT_PATH}`,
      // Future-proof: Chrome >=137 gates the --load-extension switch behind this feature.
      '--disable-features=DisableLoadExtensionCommandLineSwitch',
    ],
    userAgent: REAL_BROWSER_CONTEXT.userAgent,
    locale: REAL_BROWSER_CONTEXT.locale,
    timezoneId: REAL_BROWSER_CONTEXT.timezoneId,
    extraHTTPHeaders: REAL_BROWSER_CONTEXT.extraHTTPHeaders,
    viewport: { width: 1280, height: 800 },
  });

  // Wait for the spike background service worker so we can confirm the extension actually loaded and
  // use it as a real chrome.storage.sync channel.
  let sw = ctx.serviceWorkers()[0];
  if (!sw) {
    sw = await ctx.waitForEvent('serviceworker', { timeout: 10000 }).catch(() => undefined as never);
  }
  const extensionLoaded = !!sw;

  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const allConsole: string[] = [];
  const page = await ctx.newPage();
  page.on('console', (msg) => {
    allConsole.push(`[${msg.type()}] ${msg.text()}`);
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await gotoCached(page, HN_URL);

  // Independent of the extension: does HN's header/panel-parent selector resolve on this page?
  const headerSelectorMatches = await page.evaluate(
    (sel) => document.querySelector(sel) != null,
    '#hnmain tr:has(> td > .pagetop > .hnname) > td:last-child',
  );
  const serviceWorkers = ctx.serviceWorkers().map((w) => w.url());

  // Read hns-layout-ok from REAL storage via the background service worker (U2 verification).
  const layoutOk = sw
    ? await sw.evaluate(
        () => new Promise((r) => chrome.storage.sync.get('hns-layout-ok', (v) => r(v['hns-layout-ok']))),
      )
    : null;

  // Wait for the gate-B storage probes (U4/U5) to finish publishing their results.
  await page.waitForSelector('html[data-hns-probes-done]', { timeout: 8000 }).catch(() => {});

  // data-sort-count is published on the shadow host only after ControlPanel mounts AND the async
  // settings read settles — so its presence proves the real React tree rendered in the shadow root.
  let mounted = false;
  try {
    await page.waitForSelector(`#${CONTROL_PANEL_ROOT_ID}[data-sort-count]`, { timeout: 8000 });
    mounted = true;
  } catch {
    mounted = false;
  }

  const summary = await page.evaluate((rootId) => {
    const host = document.getElementById(rootId);
    const shadow = host?.shadowRoot ?? null;
    const buttons = shadow ? [...shadow.querySelectorAll('.hns-btn')].map((b) => b.getAttribute('data-sort')) : null;
    const dropdown = shadow ? shadow.querySelector('.hns-dropdown') != null : false;
    return {
      hostPresent: host != null,
      sortCount: host?.getAttribute('data-sort-count') ?? null,
      shadowOpen: shadow != null,
      buttons,
      dropdownPresent: dropdown,
      // Probe results (U4/U5), stashed on a DOM attribute (shared across worlds).
      probes: JSON.parse(document.documentElement.dataset.hnsProbes ?? 'null'),
      scriptRan: document.documentElement.dataset.hnsSpikeRan ?? null,
      scriptParent: document.documentElement.dataset.hnsSpikeParent ?? null,
    };
  }, CONTROL_PANEL_ROOT_ID);

  await ctx.close();
  fs.rmSync(userDataDir, { recursive: true, force: true });

  // Derive explicit gate verdicts from the probe results.
  const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  const p = summary.probes as null | {
    gateB_path1: Record<string, { type: string; value?: unknown }>;
    gateB_path2: {
      path2_preShim: Record<string, { type: string; value?: unknown }>;
      path2_postShim: Record<string, { type: string; value?: unknown }>;
      shim2: string;
      path2_postShim2: Record<string, { type: string; value?: unknown }>;
      path2_postForced: Record<string, { type: string; value?: unknown }>;
    };
  };

  const OBJ = { '123': -1, '456': 1_720_000_000_000 };
  const gateU2 =
    mounted && layoutOk === true && eq(summary.buttons, ['points', 'time', 'comments', 'velocity', 'heat', 'default']);

  const g1 = p?.gateB_path1;
  const gateU4 =
    !!g1 &&
    g1.enum.value === 'points' &&
    g1.bool.value === true &&
    g1.num.value === 3600 &&
    eq(g1.obj.value, OBJ) &&
    g1.absent.type === 'undefined';

  const g2 = p?.gateB_path2;
  const correctNatives = (r?: Record<string, { type: string; value?: unknown }>) =>
    !!r &&
    r.enum.value === 'points' &&
    r.bool.value === true &&
    r.num.value === 3600 &&
    eq(r.obj.value, OBJ) &&
    r.raw.value === true;
  const gateU5 =
    !!g2 &&
    // pre-shim: native wxt read mismatches (the Plasmo value comes back JSON-quoted / as a string)
    g2.path2_preShim.enum.value === '"points"' &&
    g2.path2_preShim.raw.value === true && // raw/native value already correct pre-shim
    // post-shim: all correct natives
    correctNatives(g2.path2_postShim) &&
    // idempotent: 2nd run is a flag no-op AND leaves values uncorrupted
    g2.shim2 === 'skipped(flag)' &&
    correctNatives(g2.path2_postShim2) &&
    // value-level guards resist double-parse even when the flag is bypassed
    correctNatives(g2.path2_postForced);

  const result = {
    verdict: {
      gateA: 'GREEN (proven separately: wxt build + tsc --noEmit both exit 0 under the installed TypeScript)',
      U2_mount: gateU2,
      U4_path1_plasmohq: gateU4,
      U5_path2_wxt_shim: gateU5,
      gateB: gateU4 || gateU5,
    },
    mounted,
    extensionLoaded,
    headerSelectorMatches,
    serviceWorkers,
    layoutOk,
    ...summary,
    consoleErrors,
    pageErrors,
    allConsole,
  };
  console.log('\n===SPIKE_VERIFY_JSON===');
  console.log(JSON.stringify(result, null, 2));
  console.log('===END===\n');

  const ok = gateU2 && gateU4 && gateU5 && pageErrors.length === 0;
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
