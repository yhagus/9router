"use client";

import { useEffect, useState } from "react";
import { Card, CardSkeleton } from "@/shared/components";

const fmt = (n) => Number(n || 0).toLocaleString();
const fmtTime = (value) => value ? new Date(value).toLocaleString() : "-";
const PAGE_SIZE = 10;

function remainingPercent(quota) {
  if (quota?.remaining !== undefined) return Math.max(0, Math.round(quota.remaining));
  if (quota?.remainingPercentage !== undefined) return Math.max(0, Math.round(quota.remainingPercentage));
  if (!quota?.total) return 0;
  if (!quota.used || quota.used < 0) return 100;
  if (quota.used >= quota.total) return 0;
  return Math.round(((quota.total - quota.used) / quota.total) * 100);
}

function resetLabel(value, recurring = true) {
  if (!value) return "N/A";
  const diffMs = new Date(value).getTime() - Date.now();
  if (!Number.isFinite(diffMs)) return "N/A";
  if (diffMs <= 0) return recurring ? "Reset now" : "Expired";
  const totalMinutes = Math.ceil(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const days = Math.floor(hours / 24);
  const label = days > 0 ? `${days}d ${hours % 24}h` : hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  return `${recurring ? "Resets" : "Expires"} in ${label}`;
}

function QuotaMiniTable({ quotas }) {
  if (!quotas?.length) return <p className="py-3 text-center text-sm text-text-muted">???</p>;
  return (
    <div className="space-y-2">
      {quotas.map((quota) => {
        const remaining = remainingPercent(quota);
        const color = remaining > 70 ? "bg-green-500" : remaining >= 30 ? "bg-yellow-500" : "bg-red-500";
        return (
          <div key={quota.name} className="rounded-lg border border-border bg-surface/60 p-3">
            <div className="mb-2 flex items-center justify-between gap-2 text-sm">
              <span className="font-medium truncate">{quota.name}</span>
              <span className="text-text-muted shrink-0">{remaining}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
              <div className={`h-full ${color}`} style={{ width: `${Math.min(remaining, 100)}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-text-muted">
              <span>{fmt(quota.used)} / {quota.total > 0 ? fmt(quota.total) : "∞"}</span>
              <span className="text-right">{resetLabel(quota.resetAt, quota.recurring !== false)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-text-muted">{label}</p>
          <p className="text-2xl font-semibold mt-1">{value}</p>
        </div>
        <span className="material-symbols-outlined text-primary text-[28px]">{icon}</span>
      </div>
    </Card>
  );
}

function Pager({ page, pages, setPage }) {
  if (pages <= 1) return null;
  const start = Math.max(1, page - 2);
  const end = Math.min(pages, start + 4);
  const pageNumbers = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3 text-sm">
      <button className="rounded-lg border border-border px-3 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
      {start > 1 && <span className="text-text-muted">...</span>}
      {pageNumbers.map((n) => (
        <button
          key={n}
          className={`min-w-8 rounded-lg border px-3 py-1 ${n === page ? "border-primary bg-primary/10 text-primary" : "border-border text-text-muted hover:text-text-main"}`}
          onClick={() => setPage(n)}
        >
          {n}
        </button>
      ))}
      {end < pages && <span className="text-text-muted">...</span>}
      <button className="rounded-lg border border-border px-3 py-1 disabled:opacity-40" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
    </div>
  );
}

export default function ClientPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modelPage, setModelPage] = useState(1);
  const [requestPage, setRequestPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/client/usage", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || "Failed to load usage");
        return res.json();
      })
      .then((json) => { if (!cancelled) setData(json); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <div className="flex flex-col gap-6"><CardSkeleton /><CardSkeleton /></div>;
  }

  if (error) {
    return <Card><p className="text-sm text-red-500">{error}</p></Card>;
  }

  const stats = data?.stats || {};
  const totalTokens = (stats.totalPromptTokens || 0) + (stats.totalCompletionTokens || 0);
  const byModel = stats.byModel || [];
  const recentRequests = stats.recentRequests || [];
  const modelPages = Math.max(1, Math.ceil(byModel.length / PAGE_SIZE));
  const requestPages = Math.max(1, Math.ceil(recentRequests.length / PAGE_SIZE));
  const visibleModels = byModel.slice((modelPage - 1) * PAGE_SIZE, modelPage * PAGE_SIZE);
  const visibleRequests = recentRequests.slice((requestPage - 1) * PAGE_SIZE, requestPage * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold">{data?.key?.name || "API Key"}</h2>
        <p className="text-sm text-text-muted">All-time usage for this API key.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Requests" value={fmt(stats.totalRequests)} icon="call_made" />
        <StatCard label="Tokens" value={fmt(totalTokens)} icon="token" />
        <StatCard label="Cached Tokens" value={fmt(stats.totalCachedTokens)} icon="cached" />
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border px-4 py-3">
          <h3 className="font-semibold">Usage by Model</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-text-muted">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Model</th>
                <th className="px-4 py-2 text-left font-medium">Provider</th>
                <th className="px-4 py-2 text-right font-medium">Requests</th>
                <th className="px-4 py-2 text-right font-medium">Tokens</th>
                <th className="px-4 py-2 text-right font-medium">Last Used</th>
              </tr>
            </thead>
            <tbody>
              {byModel.length === 0 ? (
                <tr><td className="px-4 py-6 text-center text-text-muted" colSpan={5}>No usage recorded yet.</td></tr>
              ) : visibleModels.map((row) => (
                <tr key={`${row.rawModel}-${row.provider}`} className="border-t border-border">
                  <td className="px-4 py-2 font-medium">{row.rawModel}</td>
                  <td className="px-4 py-2 text-text-muted">{row.provider || "-"}</td>
                  <td className="px-4 py-2 text-right">{fmt(row.requests)}</td>
                  <td className="px-4 py-2 text-right">{fmt((row.promptTokens || 0) + (row.completionTokens || 0))}</td>
                  <td className="px-4 py-2 text-right text-text-muted whitespace-nowrap">{fmtTime(row.lastUsed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager page={modelPage} pages={modelPages} setPage={setModelPage} />
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border px-4 py-3">
          <h3 className="font-semibold">Recent Requests</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-text-muted">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Time</th>
                <th className="px-4 py-2 text-left font-medium">Model</th>
                <th className="px-4 py-2 text-left font-medium">Provider</th>
                <th className="px-4 py-2 text-right font-medium">Tokens</th>
              </tr>
            </thead>
            <tbody>
              {recentRequests.length === 0 ? (
                <tr><td className="px-4 py-6 text-center text-text-muted" colSpan={4}>No recent requests.</td></tr>
              ) : visibleRequests.map((row, index) => (
                <tr key={`${row.timestamp}-${index}`} className="border-t border-border">
                  <td className="px-4 py-2 text-text-muted whitespace-nowrap">{fmtTime(row.timestamp)}</td>
                  <td className="px-4 py-2 font-medium">{row.model}</td>
                  <td className="px-4 py-2 text-text-muted">{row.provider || "-"}</td>
                  <td className="px-4 py-2 text-right">{fmt((row.promptTokens || 0) + (row.completionTokens || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager page={requestPage} pages={requestPages} setPage={setRequestPage} />
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border px-4 py-3">
          <h3 className="font-semibold">LLM</h3>
        </div>
        <div className="divide-y divide-border">
          {(data?.availableCombos || []).length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-text-muted">No LLMs available for this API key.</p>
          ) : data.availableCombos.map((combo) => (
            <div key={combo.id} className="px-4 py-3">
              <p className="font-medium">{combo.name}</p>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {(combo.accounts || []).length === 0 ? (
                  <div className="rounded-lg border border-border bg-surface/50 p-3 text-sm text-text-muted">???</div>
                ) : combo.accounts.map((account) => (
                  <div key={account.id} className="rounded-xl border border-border bg-black/[0.02] p-3 dark:bg-white/[0.02]">
                    <p className="mb-3 text-sm font-semibold">{account.name}</p>
                    <QuotaMiniTable quotas={account.quotas} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
