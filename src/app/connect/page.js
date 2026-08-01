"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, Badge, ThemeToggle, Skeleton } from "@/shared/components";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import { cn, formatCompact } from "@/shared/utils";
import { APP_NAME } from "@/shared/constants/config";

function getUsageLimit(k) {
  if (!k?.limitMode || k.limitMode === "none" || !(k.limitValue > 0)) return null;
  const used = k.limitMode === "tokens" ? (k.usageTokens || 0) : (k.usageRequests || 0);
  const limit = k.limitValue;
  const unit = k.limitMode === "tokens" ? "tokens" : "requests";
  const pct = Math.min(100, Math.max(0, (used / limit) * 100));
  return {
    used,
    limit,
    unit,
    pct,
    over: used >= limit,
    text: `${formatCompact(used)} / ${formatCompact(limit)} ${unit}`,
  };
}

function barColor(pct, over) {
  if (over || pct >= 100) return "bg-red-500";
  if (pct >= 80) return "bg-amber-500";
  return "bg-primary";
}

function CopyButton({ onClick, copied, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={copied ? "Copied!" : label}
      aria-label={label}
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-[8px] border transition-all duration-150",
        copied
          ? "border-brand-500/40 bg-brand-500/10 text-brand-600 dark:text-brand-300"
          : "border-border bg-surface-2 text-text-muted hover:bg-surface-3 hover:text-text-main"
      )}
    >
      <span className="material-symbols-outlined text-[16px]">{copied ? "check" : "content_copy"}</span>
    </button>
  );
}

/** Details-panel row: label | value | action, separated by dividers in the parent. */
function DetailRow({ label, sublabel, action, top = false, children }) {
  return (
    <div
      className={cn(
        "grid gap-1.5 py-4 first:pt-0 last:pb-0 sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:gap-4",
        top ? "sm:items-start" : "sm:items-center"
      )}
    >
      <div className={cn("min-w-0", top && "sm:pt-1")}>
        <p className="text-sm font-medium text-text-main">{label}</p>
        {sublabel && (
          <p className="truncate text-xs text-text-muted" title={sublabel}>
            {sublabel}
          </p>
        )}
      </div>
      <div className="min-w-0">{children}</div>
      {action && (
        <div className="flex items-center gap-2 justify-self-start sm:justify-self-end">{action}</div>
      )}
    </div>
  );
}

/** Mono value that copies on click, with hover affordance. */
function CopyableValue({ value, onCopy, label }) {
  return (
    <button
      type="button"
      onClick={onCopy}
      title="Click to copy"
      aria-label={label}
      className="group block w-full min-w-0 text-left"
    >
      <code
        className="block truncate font-mono text-sm text-text-main transition-colors group-hover:text-brand-600 dark:group-hover:text-brand-300"
        title={value}
      >
        {value}
      </code>
    </button>
  );
}

function ConnectSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-hidden="true">
      <Card padding="md" className="overflow-hidden border-brand-500/20 bg-bg/80 backdrop-blur-xl shadow-2xl ring-1 ring-white/10">
        <div className="mb-4 flex items-center gap-3">
          <Skeleton className="size-9 rounded-[10px]" />
          <div className="flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-1.5 h-3 w-64 max-w-full" />
          </div>
        </div>
        <div className="divide-y divide-border-subtle">
          <div className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="size-7 rounded-[8px]" />
          </div>
          <div className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="size-7 rounded-[8px]" />
          </div>
          <div className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
            <Skeleton className="h-4 w-16" />
            <div className="flex flex-1 flex-wrap gap-1.5">
              <Skeleton className="h-6 w-28 rounded-md" />
              <Skeleton className="h-6 w-40 rounded-md" />
              <Skeleton className="h-6 w-24 rounded-md" />
            </div>
          </div>
        </div>
      </Card>
      <Card padding="md" className="overflow-hidden border-primary/20 bg-bg/80 backdrop-blur-xl shadow-2xl ring-1 ring-white/10">
        <div className="mb-4 flex items-center gap-3">
          <Skeleton className="size-9 rounded-[10px]" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="mt-3 h-2.5 w-full rounded-full" />
      </Card>
    </div>
  );
}

export default function ConnectPage() {
  const [baseUrl, setBaseUrl] = useState("/v1");
  const [keys, setKeys] = useState([]);
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { copied, copy } = useCopyToClipboard();

  useEffect(() => {
    setBaseUrl(`${window.location.origin}/v1`);
  }, []);

  const fetchConnect = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/connect");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load");
        setKeys([]);
        setCombos([]);
        return;
      }
      setKeys(Array.isArray(data.keys) ? data.keys : []);
      setCombos(Array.isArray(data.combos) ? data.combos : []);
    } catch {
      setError("Failed to load connect info");
      setKeys([]);
      setCombos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnect();
  }, [fetchConnect]);

  const defaultKey = keys[0] || null;
  const usageLimit = useMemo(() => getUsageLimit(defaultKey), [defaultKey]);
  const initialLoading = loading && keys.length === 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-bg via-bg-secondary to-bg">
      <ThemeToggle variant="card" className="absolute right-4 top-4 z-20" />
      
      {/* Animated background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 h-[200%] w-[200%] animate-gradient-xy opacity-30 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-500/20 via-transparent to-transparent"></div>
        <div className="absolute -bottom-1/2 -right-1/2 h-[200%] w-[200%] animate-gradient-xy-reverse opacity-30 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent"></div>
      </div>

      <main className="relative z-10 mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-10 text-center">
          <div className="mx-auto mb-4 inline-flex size-12 items-center justify-center rounded-[14px] bg-brand-500/10 text-brand-500 shadow-lg ring-1 ring-brand-500/20">
            <span className="material-symbols-outlined text-[26px]">cable</span>
          </div>
          <h1 className="bg-gradient-to-r from-text-main via-brand-500 to-primary bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
            Connect to {APP_NAME}
          </h1>
        </header>

        {initialLoading ? (
          <ConnectSkeleton />
        ) : (
          <div className="flex flex-col gap-5">
            {/* Connection details panel */}
            <Card
              icon="settings_ethernet"
              title="Connection details"
              action={
                <button
                  type="button"
                  onClick={fetchConnect}
                  title="Refresh"
                  aria-label="Refresh"
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-[8px] text-text-muted transition-colors hover:bg-surface-2 hover:text-text-main"
                >
                  <span className={cn("material-symbols-outlined text-[18px]", loading && "animate-spin")}>
                    refresh
                  </span>
                </button>
              }
              className="overflow-hidden border-brand-500/20 bg-bg/80 backdrop-blur-xl shadow-2xl ring-1 ring-white/10"
            >
              {error && (
                <p className="mb-3 flex items-center gap-1.5 rounded-[10px] bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  {error}
                </p>
              )}

              <div className="divide-y divide-border-subtle">
                <DetailRow
                  label="Base URL"
                  action={
                    <CopyButton
                      onClick={() => copy(baseUrl, "base")}
                      copied={copied === "base"}
                      label="Copy base URL"
                    />
                  }
                >
                  <CopyableValue
                    value={baseUrl}
                    onCopy={() => copy(baseUrl, "base")}
                    label="Copy base URL"
                  />
                </DetailRow>

                {keys.length === 0 ? (
                  <DetailRow label="API key">
                    <p className="text-sm text-text-muted">
                      No default public key — an admin can set one on the Endpoint page.
                    </p>
                  </DetailRow>
                ) : (
                  keys.map((k) => (
                    <DetailRow
                      key={k.id}
                      label="API key"
                      sublabel={k.name}
                      action={
                        <CopyButton
                          onClick={() => copy(k.key, k.id)}
                          copied={copied === k.id}
                          label={`Copy key ${k.name}`}
                        />
                      }
                    >
                      <CopyableValue
                        value={k.key}
                        onCopy={() => copy(k.key, k.id)}
                        label={`Copy key ${k.name}`}
                      />
                    </DetailRow>
                  ))
                )}

                {keys.length > 0 && (
                  <DetailRow
                    top
                    label={
                      <span className="flex items-center gap-2">
                        Models
                        <Badge variant="default" size="sm">{combos.length}</Badge>
                      </span>
                    }
                  >
                    {combos.length === 0 ? (
                      <p className="text-xs text-text-muted">No models available for this key</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {combos.map((c) => (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => copy(c.name, `combo-${c.name}`)}
                            title={`Copy ${c.name}`}
                            aria-label={`Copy model ${c.name}`}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-xs transition-colors",
                              copied === `combo-${c.name}`
                                ? "border-brand-500/40 bg-brand-500/15 text-brand-600 dark:text-brand-300"
                                : "border-border-subtle bg-surface-2 text-text-muted hover:border-brand-500/30 hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-300"
                            )}
                          >
                            {copied === `combo-${c.name}` && (
                              <span className="material-symbols-outlined text-[14px]">check</span>
                            )}
                            {c.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </DetailRow>
                )}
              </div>
            </Card>

            {/* Usage limit — below the connection details panel */}
            {usageLimit && (
              <Card
                icon="speed"
                title="Usage limit"
                action={
                  <span
                    className={cn(
                      "font-mono text-sm font-semibold",
                      usageLimit.over ? "text-red-500" : "text-text-main"
                    )}
                  >
                    {Math.round(usageLimit.pct)}%
                  </span>
                }
                className="overflow-hidden border-primary/20 bg-bg/80 backdrop-blur-xl shadow-2xl ring-1 ring-white/10"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p
                    className={cn(
                      "font-mono text-sm font-medium",
                      usageLimit.over ? "text-red-500" : "text-text-main"
                    )}
                  >
                    {usageLimit.text}
                  </p>
                  {usageLimit.over && (
                    <Badge variant="error" size="sm" dot>
                      Limit reached
                    </Badge>
                  )}
                </div>
                <div
                  className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2"
                  role="progressbar"
                  aria-valuenow={Math.round(usageLimit.pct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Usage ${usageLimit.text}`}
                >
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-300",
                      barColor(usageLimit.pct, usageLimit.over)
                    )}
                    style={{ width: `${usageLimit.pct}%` }}
                  />
                </div>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
