/**
 * Parse InferHub public pricing HTML for free model pools.
 * Source: https://inferhub.dev/pricing
 *
 * - kind "shared": has Shared quota + N% used (Grok free, Kiro AI free)
 * - kind "open": free/ prefix pool without shared meter (SiliconFlow free)
 */

const PRICING_URL = "https://inferhub.dev/pricing";

function stripHtmlComments(html) {
  return String(html || "").replace(/<!--[\s\S]*?-->/g, "");
}

function decodeBasicEntities(text) {
  return String(text || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractModels(card, prefixBare) {
  const modelCandidates = [
    ...card.matchAll(/\b(free\/[a-zA-Z0-9_./-]+)\b/g),
  ].map((m) => m[1]);

  const models = [];
  const modelSeen = new Set();
  for (const id of modelCandidates) {
    if (!id.startsWith(`${prefixBare}/`)) continue;
    if (id === `${prefixBare}/`) continue;
    if (modelSeen.has(id)) continue;
    modelSeen.add(id);
    models.push(id);
  }
  return models;
}

function cardEndFrom(html, fromIndex) {
  const after = html.slice(fromIndex + 1);
  const nextH2 = after.search(/<h2\b/i);
  const autoRouted = after.search(/Auto-routed models/i);
  let rel = after.length;
  if (nextH2 >= 0) rel = Math.min(rel, nextH2);
  if (autoRouted >= 0) rel = Math.min(rel, autoRouted);
  return fromIndex + 1 + rel;
}

/**
 * @param {string} html
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
export function parseInferhubFreePools(html) {
  const cleaned = stripHtmlComments(html);
  const pools = [];
  const seen = new Set();

  // Free pool cards are headed by <h2>… free</h2> or carry a free/<slug>/ code.
  const h2Re = /<h2[^>]*>([^<]+)<\/h2>/gi;
  let h2Match;
  while ((h2Match = h2Re.exec(cleaned)) !== null) {
    const name = decodeBasicEntities(h2Match[1].trim());
    if (!name) continue;
    if (/auto-routed/i.test(name)) continue;

    const cardStart = h2Match.index;
    const cardEnd = cardEndFrom(cleaned, h2Match.index + h2Match[0].length - 1);
    const card = cleaned.slice(cardStart, cardEnd);

    const prefixMatch = card.match(/\b(free\/[a-zA-Z0-9_-]+)\//);
    const prefixBare = prefixMatch?.[1] || null;

    // Accept free/… prefix, or titles that end with " free" (case-insensitive).
    const titleLooksFree = /\bfree$/i.test(name);
    if (!prefixBare && !titleLooksFree) continue;
    if (!prefixBare) continue;

    const hasSharedLabel = /Shared\s+[Qq]uota/.test(card);
    const usedMatch = card.match(/(\d+)\s*%\s*used/i);
    const models = extractModels(card, prefixBare);

    // Skip non-free marketplace provider tabs (e.g. cc/) that might match loosely.
    if (!prefixBare.startsWith("free/")) continue;

    // Require at least one free model id or shared meter so empty shells are dropped.
    if (models.length === 0 && !hasSharedLabel) continue;

    let kind = "open";
    let usedPercent = null;
    let remainingPercent = null;

    if (hasSharedLabel && usedMatch) {
      const used = Math.min(100, Math.max(0, Number(usedMatch[1])));
      if (Number.isFinite(used)) {
        kind = "shared";
        usedPercent = used;
        remainingPercent = Math.max(0, 100 - used);
      }
    }

    const id = prefixBare;
    if (seen.has(id)) continue;
    seen.add(id);

    pools.push({
      id,
      name,
      prefix: `${prefixBare}/`,
      kind,
      usedPercent,
      remainingPercent,
      models,
    });
  }

  // Shared first (by remaining asc then name), then open pools.
  pools.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "shared" ? -1 : 1;
    if (a.kind === "shared") {
      const ra = a.remainingPercent ?? 0;
      const rb = b.remainingPercent ?? 0;
      if (ra !== rb) return ra - rb;
    }
    return a.name.localeCompare(b.name);
  });

  return { pools };
}

/** @deprecated use parseInferhubFreePools */
export function parseInferhubSharedQuotas(html) {
  return parseInferhubFreePools(html);
}

export async function fetchInferhubFreePools(fetchImpl = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetchImpl(PRICING_URL, {
      method: "GET",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "9Router-FreeTracker/1.0",
      },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`InferHub pricing returned HTTP ${res.status}`);
    }
    const html = await res.text();
    const { pools } = parseInferhubFreePools(html);
    return {
      source: "inferhub",
      sourceUrl: PRICING_URL,
      fetchedAt: new Date().toISOString(),
      pools,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** @deprecated use fetchInferhubFreePools */
export async function fetchInferhubSharedQuotas(fetchImpl = fetch) {
  return fetchInferhubFreePools(fetchImpl);
}

export { PRICING_URL };
