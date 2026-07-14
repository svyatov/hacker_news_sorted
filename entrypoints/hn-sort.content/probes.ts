/**
 * Spike-only storage proofs for gate B (branch spike/wxt — deleted on cleanup).
 *   U4 (R3, path 1): @plasmohq/storage, unchanged, reads a pre-existing Plasmo-format value correctly.
 *   U5 (R4, path 2): wxt/storage + a one-time JSON.parse migration shim reads the same value correctly.
 *
 * Q1 settled: cover the enum string PLUS a boolean, a number, an object, and a RAW-written value
 * (mimicking content.tsx's raw `hns-layout-ok`) — because the U5 shim's double-parse corruption risk
 * only surfaces on values that are themselves valid JSON, and the raw value must NOT be unwrapped.
 * Testing the enum alone would false-green U5.
 *
 * Seeding (KTD-4): @plasmohq/storage JSON-stringifies, so every value it writes is physically a STRING
 * (JSON text) in chrome.storage.sync. We seed that on-disk shape directly into the WXT extension's OWN
 * storage silo (dedicated `hns-spike:` keys so the shim's write-backs can't perturb the live panel's
 * useSettings watchers). The raw key is seeded as a native value, like content.tsx writes layout-ok.
 */
import { storage as wxtStorage, type StorageItemKey } from '#imports';

import { Storage } from '@plasmohq/storage';

const K = {
  enum: 'hns-spike:enum',
  bool: 'hns-spike:bool',
  num: 'hns-spike:num',
  obj: 'hns-spike:obj',
  raw: 'hns-spike:raw', // written RAW/native, mimicking content.tsx's `hns-layout-ok`
  absent: 'hns-spike:absent', // never seeded
  migrated: 'hns-spike:migrated', // one-time shim flag
} as const;

const OBJ_VALUE = { '123': -1, '456': 1_720_000_000_000 };
// The @plasmohq/storage-format keys the shim migrates (everything except the raw/native one).
const WRAPPED_KEYS = [K.enum, K.bool, K.num, K.obj, K.raw];

const skey = (k: string): StorageItemKey => `sync:${k}` as StorageItemKey;
const shape = (v: unknown) => ({ type: v === null ? 'null' : typeof v, value: v });

async function seed(): Promise<void> {
  // Plasmo on-disk format = JSON.stringify(native): a string in chrome.storage.sync.
  await chrome.storage.sync.set({
    [K.enum]: JSON.stringify('points'), // '"points"'
    [K.bool]: JSON.stringify(true), // 'true'
    [K.num]: JSON.stringify(3600), // '3600'
    [K.obj]: JSON.stringify(OBJ_VALUE), // '{"123":-1,"456":1720000000000}'
  });
  // Raw/native write, exactly how content.tsx:19 writes hns-layout-ok (bypassing @plasmohq/storage).
  await chrome.storage.sync.set({ [K.raw]: true });
  await chrome.storage.sync.remove([K.absent, K.migrated]);
}

// U4 — Path 1: @plasmohq/storage reads the Plasmo-format value and JSON-parses it back to native.
async function path1(): Promise<Record<string, unknown>> {
  const p = new Storage(); // default area is 'sync' (as useSettings.ts:18)
  return {
    enum: shape(await p.get(K.enum)), // -> 'points'
    bool: shape(await p.get<boolean>(K.bool)), // -> true
    num: shape(await p.get<number>(K.num)), // -> 3600
    obj: shape(await p.get<typeof OBJ_VALUE>(K.obj)), // -> { '123': -1, ... }
    absent: shape(await p.get(K.absent)), // -> undefined (no crash)
  };
}

async function readAllViaWxt(): Promise<Record<string, unknown>> {
  return {
    enum: shape(await wxtStorage.getItem(skey(K.enum))),
    bool: shape(await wxtStorage.getItem(skey(K.bool))),
    num: shape(await wxtStorage.getItem(skey(K.num))),
    obj: shape(await wxtStorage.getItem(skey(K.obj))),
    raw: shape(await wxtStorage.getItem(skey(K.raw))),
  };
}

// One-time migration shim: unwrap each @plasmohq/storage-format (JSON-string) value to native.
// Guards: (1) a one-time flag so it runs exactly once; (2) only unwrap STRINGS, so the raw/native
// layout-ok-style value is left untouched; (3) try/catch so an already-unwrapped string (e.g. the
// enum 'points', which is not valid JSON) is left as-is instead of throwing.
async function runShim(force = false): Promise<string> {
  if (!force && (await wxtStorage.getItem(skey(K.migrated)))) return 'skipped(flag)';
  for (const k of WRAPPED_KEYS) {
    const v = await wxtStorage.getItem(skey(k));
    if (typeof v !== 'string') continue; // guard (2): never unwrap raw/native values
    try {
      await wxtStorage.setItem(skey(k), JSON.parse(v));
    } catch {
      // guard (3): already-native string that isn't valid JSON — leave it.
    }
  }
  await wxtStorage.setItem(skey(K.migrated), true);
  return force ? 'forced' : 'migrated';
}

export type SpikeProbeResults = Awaited<ReturnType<typeof runStorageProbes>>;

export async function runStorageProbes() {
  await seed();

  const gateB_path1 = await path1();

  const path2_preShim = await readAllViaWxt();
  const shim1 = await runShim();
  const path2_postShim = await readAllViaWxt();
  const shim2 = await runShim(); // idempotency: flag set -> no-op
  const path2_postShim2 = await readAllViaWxt();
  const shim3 = await runShim(true); // forced re-run: proves the value-level guards resist double-parse
  const path2_postForced = await readAllViaWxt();

  return {
    gateB_path1,
    gateB_path2: { path2_preShim, shim1, path2_postShim, shim2, path2_postShim2, shim3, path2_postForced },
  };
}
