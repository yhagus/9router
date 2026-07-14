/**
 * Free Tracker public visibility (settings.freeTrackerPublic).
 * Missing key = not public (default OFF).
 */

export function isSourcePublic(settings, sourceId) {
  if (!sourceId) return false;
  const map = settings?.freeTrackerPublic;
  if (!map || typeof map !== "object") return false;
  return map[sourceId] === true;
}

export function filterPublicSources(sources, settings) {
  return (sources || []).filter((s) => isSourcePublic(settings, s?.id));
}

/**
 * @param {Record<string, boolean> | undefined} current
 * @param {string} sourceId
 * @param {boolean} publicVisible
 */
export function nextFreeTrackerPublicMap(current, sourceId, publicVisible) {
  const map = { ...(current && typeof current === "object" ? current : {}) };
  if (publicVisible) map[sourceId] = true;
  else delete map[sourceId];
  return map;
}
