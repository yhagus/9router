"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Button, Input } from "@/shared/components";

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
      </div>
    </div>
  );
}
