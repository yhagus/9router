import {
  fetchInferhubFreePools,
  PRICING_URL,
} from "@/lib/freeTracker/inferhubPricing";
import { flattenPoolsToSource } from "@/lib/freeTracker/flatten";
import { isSourcePublic } from "@/lib/freeTracker/visibility";

const CACHE_TTL_MS = 30_000;
let cache = null;

async function fetchPoolsPayload() {
  const now = Date.now();
  if (cache && now - cache.cachedAt < CACHE_TTL_MS) {
    return { payload: cache.payload, cached: true };
  }
  const payload = await fetchInferhubFreePools();
  cache = { cachedAt: now, payload };
  return { payload, cached: false };
}

/**
 * Build Free Tracker sources from InferHub scrape + settings visibility.
 * @param {object} settings
 * @param {{ publicOnly?: boolean }} [opts]
 */
export async function buildFreeTrackerSources(settings, opts = {}) {
  const { payload, cached } = await fetchPoolsPayload();
  const inferhub = flattenPoolsToSource(payload.pools || [], {
    id: "inferhub",
    name: "InferHub",
    icon: "/providers/inferhub.png",
    sourceUrl: payload.sourceUrl || PRICING_URL,
    note: "Shared bars are community pools, not your local account quota.",
  });
  inferhub.publicVisible = isSourcePublic(settings, inferhub.id);

  let sources = [inferhub];
  if (opts.publicOnly) {
    sources = sources.filter((s) => s.publicVisible === true);
  }

  return {
    sources,
    fetchedAt: payload.fetchedAt || new Date().toISOString(),
    cached,
    // Keep pools for backward compatibility with older clients
    pools: payload.pools || [],
    source: "inferhub",
    sourceUrl: payload.sourceUrl || PRICING_URL,
  };
}

export { PRICING_URL };
