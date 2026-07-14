"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Card from "@/shared/components/Card";
import ProviderIcon from "@/shared/components/ProviderIcon";
import Toggle from "@/shared/components/Toggle";
import { CardSkeleton } from "@/shared/components/Loading";

const REFRESH_INTERVAL_MS = 60_000;
const AUTO_REFRESH_STORAGE_KEY = "freeTrackerAutoRefresh";

function getColorClasses(remainingPercentage) {
  if (remainingPercentage > 70) {
    return {
      text: "text-green-600 dark:text-green-400",
      bg: "bg-green-500",
      bgLight: "bg-green-500/10",
      emoji: "🟢",
    };
  }
  if (remainingPercentage >= 30) {
    return {
      text: "text-yellow-600 dark:text-yellow-400",
      bg: "bg-yellow-500",
      bgLight: "bg-yellow-500/10",
      emoji: "🟡",
    };
  }
  return {
    text: "text-red-600 dark:text-red-400",
    bg: "bg-red-500",
    bgLight: "bg-red-500/10",
    emoji: "🔴",
  };
}

function formatFetchedAt(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return null;
  }
}

function shortModelLabel(modelId, prefix) {
  if (!modelId) return "";
  if (prefix && modelId.startsWith(prefix)) return modelId.slice(prefix.length);
  const parts = modelId.split("/");
  return parts[parts.length - 1] || modelId;
}

function ModelQuotaRow({ row }) {
  const isShared = row.kind === "shared";
  const remaining = isShared
    ? Math.min(100, Math.max(0, row.remainingPercent ?? 0))
    : null;
  const colors = isShared ? getColorClasses(remaining ?? 0) : null;
  const label = shortModelLabel(row.id, row.poolPrefix);

  return (
    <tr className="border-b border-black/5 dark:border-white/5 last:border-b-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
      <td className="py-1.5 px-1.5 w-[34%]">
        <div className="min-w-0">
          <code
            className="block truncate text-[11px] font-mono font-medium text-text-primary"
            title={row.id}
          >
            {label}
          </code>
          <span className="block truncate text-[10px] text-text-muted">
            {row.poolName}
            <span className="text-text-muted/70">
              {" · "}
              {isShared ? "Shared" : "Open"}
            </span>
          </span>
        </div>
      </td>
      <td className="py-1.5 px-1.5 w-[46%]">
        {isShared ? (
          <div className="space-y-1">
            <div className={`h-1 rounded-full overflow-hidden ${colors.bgLight}`}>
              <div
                className={`h-full transition-all duration-300 ${colors.bg}`}
                style={{ width: `${remaining}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-text-muted">
              <span className="tabular-nums">{row.usedPercent}% used</span>
              <span className={`font-medium tabular-nums ${colors.text}`}>
                {remaining}% left
              </span>
            </div>
          </div>
        ) : (
          <span className="text-[10px] text-text-muted">No meter</span>
        )}
      </td>
      <td className="py-1.5 px-1.5 w-[20%] text-right">
        {isShared ? (
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${colors.text}`}>
            <span className="text-[10px]">{colors.emoji}</span>
            <span className="tabular-nums">{remaining}%</span>
          </span>
        ) : (
          <span className="text-[10px] text-text-muted">—</span>
        )}
      </td>
    </tr>
  );
}

function SourceCard({
  source,
  loading,
  error,
  onRefresh,
  refreshing,
  showPublicToggle,
  onTogglePublic,
  togglingPublic,
}) {
  const models = source?.models || [];
  const isPublic = source?.publicVisible === true;

  return (
    <Card padding="none" className="min-w-0">
      <div className="px-3 py-2 border-b border-black/10 dark:border-white/10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 shrink-0 rounded-md flex items-center justify-center overflow-hidden">
              <ProviderIcon
                src={source.icon || "/providers/inferhub.png"}
                alt={source.name}
                size={32}
                className="object-contain"
                fallbackText={(source.name || "FR").slice(0, 2).toUpperCase()}
                fallbackColor="#6366F1"
              />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-text-primary truncate">
                {source.name}
              </h3>
              {source.sourceUrl ? (
                <a
                  href={source.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-text-muted hover:text-primary truncate block"
                >
                  {source.sourceUrl.replace(/^https?:\/\//, "")}
                </a>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {showPublicToggle && (
              <div
                className="flex items-center gap-1.5"
                title={isPublic ? "Visible on client Free Tracker" : "Hidden from clients"}
              >
                <span className="hidden sm:inline text-[10px] text-text-muted">
                  {isPublic ? "Public" : "Private"}
                </span>
                <Toggle
                  size="sm"
                  checked={isPublic}
                  disabled={togglingPublic || loading}
                  onChange={(next) => onTogglePublic?.(source.id, next)}
                />
              </div>
            )}
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing || loading}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
              title="Refresh"
              aria-label="Refresh free models"
            >
              <span
                className={`material-symbols-outlined text-[18px] text-text-muted ${
                  refreshing || loading ? "animate-spin" : ""
                }`}
              >
                refresh
              </span>
            </button>
          </div>
        </div>
        {source.note ? (
          <p className="mt-1.5 text-[10px] leading-relaxed text-text-muted">
            {source.note}
          </p>
        ) : null}
      </div>

      <div className="px-2 py-1.5">
        {loading ? (
          <div className="text-center py-5 text-text-muted">
            <span className="material-symbols-outlined text-[28px] animate-spin">
              progress_activity
            </span>
          </div>
        ) : error ? (
          <div className="text-center py-5">
            <span className="material-symbols-outlined text-[28px] text-red-500">
              error
            </span>
            <p className="mt-1.5 text-xs text-text-muted">{error}</p>
          </div>
        ) : models.length === 0 ? (
          <div className="text-center py-5 text-text-muted">
            <p className="text-xs">No free models found</p>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="px-1 text-[10px] text-text-muted">
              {models.length} model{models.length === 1 ? "" : "s"}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-left">
                <tbody>
                  {models.map((row) => (
                    <ModelQuotaRow key={row.id} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export default function FreeTrackerPage() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [hasHydratedAutoRefresh, setHasHydratedAutoRefresh] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [togglingId, setTogglingId] = useState(null);

  const intervalRef = useRef(null);
  const countdownRef = useRef(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch("/api/free-tracker", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setSources(Array.isArray(data.sources) ? data.sources : []);
      setFetchedAt(data.fetchedAt || new Date().toISOString());
      setError(null);
      setCountdown(Math.round(REFRESH_INTERVAL_MS / 1000));
    } catch (err) {
      setError(err?.message || "Failed to load free model quotas");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const togglePublic = useCallback(async (sourceId, publicVisible) => {
    setTogglingId(sourceId);
    // Optimistic update
    setSources((prev) =>
      prev.map((s) => (s.id === sourceId ? { ...s, publicVisible } : s)),
    );
    try {
      const res = await fetch("/api/free-tracker", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId, publicVisible }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    } catch (err) {
      // Rollback
      setSources((prev) =>
        prev.map((s) =>
          s.id === sourceId ? { ...s, publicVisible: !publicVisible } : s,
        ),
      );
      setError(err?.message || "Failed to update public visibility");
    } finally {
      setTogglingId(null);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(AUTO_REFRESH_STORAGE_KEY);
      if (stored === "false") setAutoRefresh(false);
      if (stored === "true") setAutoRefresh(true);
    } catch {
      /* ignore */
    }
    setHasHydratedAutoRefresh(true);
  }, []);

  useEffect(() => {
    if (!hasHydratedAutoRefresh) return;
    try {
      window.localStorage.setItem(AUTO_REFRESH_STORAGE_KEY, String(autoRefresh));
    } catch {
      /* ignore */
    }
  }, [autoRefresh, hasHydratedAutoRefresh]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!hasHydratedAutoRefresh || !autoRefresh) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      return undefined;
    }

    setCountdown(Math.round(REFRESH_INTERVAL_MS / 1000));

    intervalRef.current = setInterval(() => {
      load({ silent: true });
    }, REFRESH_INTERVAL_MS);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? Math.round(REFRESH_INTERVAL_MS / 1000) : prev - 1));
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [autoRefresh, hasHydratedAutoRefresh, load]);

  if (loading && sources.length === 0 && !error) {
    return (
      <div className="flex flex-col gap-4 px-1 sm:px-0">
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4 px-1 sm:px-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-text-muted">
            Free model pool status from free sources. Toggle Public to show a card on the client portal.
          </p>
          {fetchedAt && (
            <p className="mt-0.5 text-[11px] text-text-muted">
              Updated {formatFetchedAt(fetchedAt)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setAutoRefresh((prev) => !prev)}
            className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-black/10 px-2 text-xs transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
            title={autoRefresh ? "Disable auto-refresh" : "Enable auto-refresh"}
          >
            <span
              className={`material-symbols-outlined text-[14px] ${
                autoRefresh ? "text-primary" : "text-text-muted"
              }`}
            >
              {autoRefresh ? "toggle_on" : "toggle_off"}
            </span>
            <span className="hidden text-text-primary sm:inline">Auto-refresh</span>
            {autoRefresh && (
              <span className="text-[10px] text-text-muted tabular-nums">({countdown}s)</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => load()}
            disabled={refreshing}
            className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-black/10 px-2 text-xs text-text-primary transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5 disabled:opacity-50"
            title="Refresh now"
          >
            <span
              className={`material-symbols-outlined text-[14px] ${refreshing ? "animate-spin" : ""}`}
            >
              refresh
            </span>
            <span className="hidden sm:inline">{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {sources.map((source) => (
          <SourceCard
            key={source.id}
            source={source}
            loading={loading && sources.length === 0}
            error={null}
            onRefresh={() => load()}
            refreshing={refreshing}
            showPublicToggle
            onTogglePublic={togglePublic}
            togglingPublic={togglingId === source.id}
          />
        ))}
      </div>

      {!error && sources.length === 0 && (
        <Card padding="md">
          <p className="text-sm text-text-muted">No free sources available.</p>
        </Card>
      )}
    </div>
  );
}
