import {
  fetchInferhubFreePools,
  PRICING_URL,
} from "@/lib/freeTracker/inferhubPricing";
import {
  fetchDudulFreePools,
  SOURCE_URL as DUDUL_SOURCE_URL,
} from "@/lib/freeTracker/dudulCredits";
import { flattenPoolsToSource } from "@/lib/freeTracker/flatten";
import { isSourcePublic } from "@/lib/freeTracker/visibility";

const CACHE_TTL_MS = 30_000;
let cache = null;

async function settledPayload(promise, label) {
  try {
    const payload = await promise;
    return { ok: true, payload, label };
  } catch (err) {
    return {
      ok: false,
      label,
      error: err?.name === "AbortError"
        ? `Timed out fetching ${label}`
        : err?.message || `Failed to fetch ${label}`,
    };
  }
}

async function fetchAllPayloads() {
  const now = Date.now();
  if (cache && now - cache.cachedAt < CACHE_TTL_MS) {
    return { ...cache, cached: true };
  }

  const [inferhub, dudul] = await Promise.all([
    settledPayload(fetchInferhubFreePools(), "InferHub"),
    settledPayload(fetchDudulFreePools(), "Dudul"),
  ]);

  const next = {
    cachedAt: now,
    inferhub,
    dudul,
  };
  cache = next;
  return { ...next, cached: false };
}

/**
 * Build Free Tracker sources (InferHub + Dudul) + settings visibility.
 * Fail-open: one source failing still returns the other.
 * @param {object} settings
 * @param {{ publicOnly?: boolean }} [opts]
 */
export async function buildFreeTrackerSources(settings, opts = {}) {
  const { inferhub, dudul, cached } = await fetchAllPayloads();
  const sources = [];
  const errors = [];
  let fetchedAt = null;

  if (inferhub.ok) {
    const payload = inferhub.payload;
    fetchedAt = payload.fetchedAt || fetchedAt;
    const source = flattenPoolsToSource(payload.pools || [], {
      id: "inferhub",
      name: "InferHub",
      icon: "/providers/inferhub.png",
      sourceUrl: payload.sourceUrl || PRICING_URL,
      note: "Shared bars are community pools, not your local account quota.",
    });
    source.publicVisible = isSourcePublic(settings, source.id);
    sources.push(source);
  } else {
    errors.push(inferhub.error);
  }

  if (dudul.ok) {
    const payload = dudul.payload;
    fetchedAt = payload.fetchedAt || fetchedAt;
    const source = flattenPoolsToSource(payload.pools || [], {
      id: "dudul",
      name: "Dudul",
      icon: "/providers/dudul.png",
      sourceUrl: payload.sourceUrl || DUDUL_SOURCE_URL,
      note: "Shared credits across Dudul free keys (public pool).",
    });
    source.publicVisible = isSourcePublic(settings, source.id);
    sources.push(source);
  } else {
    errors.push(dudul.error);
  }

  if (sources.length === 0) {
    throw new Error(errors[0] || "Failed to fetch free model quotas");
  }

  let out = sources;
  if (opts.publicOnly) {
    out = out.filter((s) => s.publicVisible === true);
  }

  // Backward-compatible top-level pools = first source's underlying pools if present
  const primaryPools = inferhub.ok
    ? (inferhub.payload.pools || [])
    : (dudul.ok ? (dudul.payload.pools || []) : []);

  return {
    sources: out,
    fetchedAt: fetchedAt || new Date().toISOString(),
    cached,
    pools: primaryPools,
    source: inferhub.ok ? "inferhub" : "dudul",
    sourceUrl: inferhub.ok ? PRICING_URL : DUDUL_SOURCE_URL,
    ...(errors.length ? { partialErrors: errors } : {}),
  };
}

export { PRICING_URL };
