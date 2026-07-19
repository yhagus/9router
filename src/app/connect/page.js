"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, Button, Input } from "@/shared/components";

function formatCompact(n) {
  const num = Number(n) || 0;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(num >= 10_000_000 ? 0 : 1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(num >= 10_000 ? 0 : 1)}k`;
  return String(num);
}

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

export default function ConnectPage() {
  const [baseUrl, setBaseUrl] = useState("/v1");
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(null);

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
        return;
      }
      setKeys(Array.isArray(data.keys) ? data.keys : []);
    } catch {
      setError("Failed to load connect info");
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnect();
  }, [fetchConnect]);

  const copy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied((prev) => (prev === id ? null : prev)), 1500);
    } catch {
      // ignore
    }
  };

  const defaultKey = keys[0] || null;
  const usageLimit = useMemo(() => getUsageLimit(defaultKey), [defaultKey]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4 relative">
      <div className="landing-grid absolute inset-0 pointer-events-none" aria-hidden="true" />
      <div className="w-full max-w-lg relative z-10 flex flex-col gap-4">
        <div className="text-center mb-2">
          <h1 className="text-2xl font-bold text-text-main">Connect to 9Router</h1>
          <p className="text-sm text-text-muted mt-1">
            OpenAI-compatible base URL and public API keys
          </p>
        </div>

        <Card padding="md">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-text-main">Base URL</label>
            <div className="flex items-center gap-2">
              <Input value={baseUrl} readOnly className="flex-1 font-mono text-sm" />
              <Button
                type="button"
                variant="secondary"
                onClick={() => copy(baseUrl, "base")}
                className="shrink-0"
                title="Copy base URL"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {copied === "base" ? "check" : "content_copy"}
                </span>
              </Button>
            </div>
            <p className="text-xs text-text-muted">
              Use this as the API base in OpenAI-compatible clients (e.g.{" "}
              <code className="bg-sidebar px-1 rounded">…/v1/chat/completions</code>).
            </p>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-text-main flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[18px]">vpn_key</span>
                  Default public API key
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Shared key for public access. Prefer private keys for personal use.
                </p>
              </div>
              <button
                type="button"
                onClick={fetchConnect}
                className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-black/5 dark:hover:bg-white/5"
                title="Refresh"
                aria-label="Refresh"
              >
                <span className={`material-symbols-outlined text-[18px] ${loading ? "animate-spin" : ""}`}>
                  refresh
                </span>
              </button>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            {loading && keys.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-text-muted gap-2 text-sm">
                <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                Loading…
              </div>
            ) : keys.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary mb-2">
                  <span className="material-symbols-outlined text-[20px]">vpn_key_off</span>
                </div>
                <p className="text-sm font-medium text-text-main">No default public key</p>
                <p className="text-xs text-text-muted mt-1">
                  An admin can set a public key as default on the Endpoint page.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {keys.map((k) => (
                  <li
                    key={k.id}
                    className="rounded-lg border border-black/5 dark:border-white/10 px-3 py-2.5 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-text-main truncate" title={k.name}>
                        {k.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
                        Public
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <code className="flex-1 min-w-0 text-xs font-mono text-text-muted truncate">
                        {k.key}
                      </code>
                      <button
                        type="button"
                        onClick={() => copy(k.key, k.id)}
                        className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded text-text-muted hover:text-primary shrink-0"
                        title="Copy key"
                        aria-label={`Copy key ${k.name}`}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {copied === k.id ? "check" : "content_copy"}
                        </span>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {usageLimit && (
          <Card padding="md">
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-text-main flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">speed</span>
                    Usage limit
                  </h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    Lifetime quota for the default public key
                  </p>
                </div>
                <span
                  className={`text-xs font-mono font-medium shrink-0 ${
                    usageLimit.over ? "text-red-500" : "text-text-main"
                  }`}
                >
                  {Math.round(usageLimit.pct)}%
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <p
                  className={`text-sm font-mono font-medium ${
                    usageLimit.over ? "text-red-500" : "text-text-main"
                  }`}
                >
                  {usageLimit.text}
                </p>
                {usageLimit.over && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 shrink-0">
                    Limit reached
                  </span>
                )}
              </div>

              <div
                className="h-2.5 w-full rounded-full bg-black/5 dark:bg-white/10 overflow-hidden"
                role="progressbar"
                aria-valuenow={Math.round(usageLimit.pct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Usage ${usageLimit.text}`}
              >
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ${barColor(
                    usageLimit.pct,
                    usageLimit.over
                  )}`}
                  style={{ width: `${usageLimit.pct}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] text-text-muted font-mono">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
