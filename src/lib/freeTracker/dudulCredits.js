/**
 * Dudul public free credits pool.
 * Source: https://dudul.dev/api/credits (no auth)
 *
 * Response shape:
 *   { object: "list", keys: [{ label, key_prefix, quota_credits, remaining_credits, used_credits, status, ... }] }
 *
 * Free Tracker maps the sum of active keys into one shared pool bar.
 */

const CREDITS_URL = "https://dudul.dev/api/credits";
const SOURCE_URL = "https://dudul.dev/";

// Seed model ids for display rows under the shared bar (same % on each).
const DUDUL_FREE_MODELS = [
  "deepseek-v4-flash",
  "kimi-k2.7-code",
  "kimi-k3",
  "minimax-m3",
  "qwen3.7-max",
  "qwen3.7-plus",
];

/**
 * @param {unknown} raw
 * @returns {{ pools: Array<{
 *   id: string,
 *   name: string,
 *   prefix: string,
 *   kind: "shared" | "open",
 *   usedPercent: number | null,
 *   remainingPercent: number | null,
 *   models: string[],
 * }> }}
 */
export function parseDudulCredits(raw) {
  const keys = Array.isArray(raw?.keys) ? raw.keys : [];
  let quota = 0;
  let remaining = 0;

  for (const key of keys) {
    if (!key || typeof key !== "object") continue;
    if (key.status && String(key.status).toLowerCase() !== "active") continue;
    const q = Number(key.quota_credits);
    if (!Number.isFinite(q) || q <= 0) continue;
    const r = Number(key.remaining_credits);
    const rem = Number.isFinite(r) ? Math.max(0, r) : 0;
    quota += q;
    remaining += Math.min(rem, q);
  }

  if (quota <= 0) {
    return { pools: [] };
  }

  const remainingPercent = Math.min(100, Math.max(0, Math.round((remaining / quota) * 100)));
  const usedPercent = Math.min(100, Math.max(0, 100 - remainingPercent));

  return {
    pools: [
      {
        id: "dudul",
        name: "Dudul",
        prefix: "dudul/",
        kind: "shared",
        usedPercent,
        remainingPercent,
        models: [...DUDUL_FREE_MODELS],
      },
    ],
  };
}

export async function fetchDudulFreePools(fetchImpl = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetchImpl(CREDITS_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "9Router-FreeTracker/1.0",
      },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Dudul credits returned HTTP ${res.status}`);
    }
    const json = await res.json();
    const { pools } = parseDudulCredits(json);
    return {
      source: "dudul",
      sourceUrl: SOURCE_URL,
      fetchedAt: new Date().toISOString(),
      pools,
    };
  } finally {
    clearTimeout(timer);
  }
}

export { CREDITS_URL, SOURCE_URL, DUDUL_FREE_MODELS };
