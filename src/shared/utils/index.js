// Shared Utils - Export all
export { cn } from "./cn";
export { formatCompact } from "./formatCompact";
export * as api from "./api";
export { getProviderIconSrc, markProviderIconMissing, resolveProviderIconId } from "./providerIcon";

import { v4 as uuidv4 } from "uuid";

/**
 * Generate unique ID (UUID v4)
 * @returns {string} UUID v4 string
 */
export const generateId = uuidv4;

/**
 * Extract error code from error message (401, 429, 503...)
 * @param {string} lastError - Error message
 * @returns {string|null} Error code or null
 */
export function getErrorCode(lastError) {
  if (!lastError) return null;
  const match = lastError.match(/\b([45]\d{2})\b/);
  return match ? match[1] : "ERR";
}

/**
 * Get relative time string (e.g. "5 min ago")
 * @param {string} isoDate - ISO date string
 * @returns {string} Relative time
 */
export function getRelativeTime(isoDate) {
  if (!isoDate) return "";
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Format an ISO date as a compact relative time string
 * (e.g. "Just now", "5m ago", "3h ago", "2d ago").
 * Falls back to a locale date for anything older than 30 days.
 * @param {string} iso - ISO date string
 * @returns {string} Relative time, or "—" if missing/invalid
 */
export function formatRelativeTime(iso) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = Date.now() - t;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 30 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * Format an ISO date as a full locale date-time string (e.g. for tooltips).
 * @param {string} iso - ISO date string
 * @returns {string} Full date-time, or "" if missing/invalid
 */
export function formatFullDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

