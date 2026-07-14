/**
 * Flatten free pools into per-source model rows for Free Tracker UI.
 */

/**
 * @param {Array<{
 *   id: string,
 *   name: string,
 *   prefix: string,
 *   kind: "shared" | "open",
 *   usedPercent: number | null,
 *   remainingPercent: number | null,
 *   models: string[],
 * }>} pools
 * @param {{ id?: string, name?: string, icon?: string, sourceUrl?: string, note?: string }} sourceMeta
 */
export function flattenPoolsToSource(pools, sourceMeta = {}) {
  const models = [];
  for (const pool of pools || []) {
    const ids = Array.isArray(pool.models) && pool.models.length > 0
      ? pool.models
      : [];
    // Open/shared pool with no model ids still surfaces as a single row on the prefix.
    const rowIds = ids.length > 0 ? ids : (pool.prefix ? [pool.prefix.replace(/\/$/, "")] : []);
    for (const modelId of rowIds) {
      models.push({
        id: modelId,
        poolId: pool.id,
        poolName: pool.name,
        poolPrefix: pool.prefix,
        kind: pool.kind === "shared" ? "shared" : "open",
        usedPercent: pool.kind === "shared" ? pool.usedPercent : null,
        remainingPercent: pool.kind === "shared" ? pool.remainingPercent : null,
      });
    }
  }

  models.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "shared" ? -1 : 1;
    if (a.kind === "shared") {
      const ra = a.remainingPercent ?? 0;
      const rb = b.remainingPercent ?? 0;
      if (ra !== rb) return ra - rb;
    }
    return (a.id || "").localeCompare(b.id || "");
  });

  return {
    id: sourceMeta.id || "inferhub",
    name: sourceMeta.name || "InferHub",
    icon: sourceMeta.icon || "/providers/inferhub.png",
    sourceUrl: sourceMeta.sourceUrl || "https://inferhub.dev/pricing",
    note:
      sourceMeta.note ||
      "Shared bars are community pools, not your local account quota.",
    models,
  };
}
