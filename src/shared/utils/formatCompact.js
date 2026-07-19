/**
 * Compact number for usage/token labels (k / M / B / T).
 * 1 decimal when quotient < 10 for that unit; 0 decimals otherwise.
 * @param {number|string|null|undefined} n
 * @returns {string}
 */
export function formatCompact(n) {
  const num = Number(n) || 0;
  if (num >= 1_000_000_000_000) {
    return `${(num / 1_000_000_000_000).toFixed(num >= 10_000_000_000_000 ? 0 : 1)}T`;
  }
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(num >= 10_000_000_000 ? 0 : 1)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(num >= 10_000_000 ? 0 : 1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(num >= 10_000 ? 0 : 1)}k`;
  }
  return String(num);
}
