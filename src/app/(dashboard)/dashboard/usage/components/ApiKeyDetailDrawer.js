"use client";

import Drawer from "@/shared/components/Drawer";
import { cn } from "@/shared/utils/cn";

function formatCompact(n) {
  const num = Number(n) || 0;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(num >= 10_000_000 ? 0 : 1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(num >= 10_000 ? 0 : 1)}k`;
  return String(num);
}

function formatFull(n) {
  return (Number(n) || 0).toLocaleString();
}

function formatTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "—";
  }
}

function StatCard({ label, value, sub, title }) {
  return (
    <div className="rounded-lg border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] p-3">
      <p className="text-[11px] text-text-muted uppercase tracking-wide">{label}</p>
      <p className="text-lg font-semibold font-mono text-text-main mt-0.5" title={title}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function HighlightCard({ label, model, provider, metricLabel, metricValue }) {
  if (!model) {
    return (
      <div className="rounded-lg border border-dashed border-black/10 dark:border-white/10 p-3">
        <p className="text-[11px] text-text-muted uppercase tracking-wide">{label}</p>
        <p className="text-sm text-text-muted mt-1">No data</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
      <p className="text-[11px] text-text-muted uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-text-main mt-1 truncate" title={model}>
        {model}
      </p>
      <p className="text-[11px] text-text-muted mt-0.5">
        {provider || "—"} · {metricLabel}: <span className="font-mono">{metricValue}</span>
      </p>
    </div>
  );
}

function ModelTable({ rows, emptyMessage }) {
  if (!rows?.length) {
    return <p className="text-sm text-text-muted py-4 text-center">{emptyMessage}</p>;
  }
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full min-w-[480px] text-sm text-left">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-text-muted border-b border-black/5 dark:border-white/5">
            <th className="py-2 px-2 font-medium">Model</th>
            <th className="py-2 px-2 font-medium">Provider</th>
            <th className="py-2 px-2 font-medium text-right">Req</th>
            <th className="py-2 px-2 font-medium text-right">Tokens</th>
            <th className="py-2 px-2 font-medium text-right">In / Out</th>
            <th className="py-2 px-2 font-medium text-right">Last used</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const total = (row.promptTokens || 0) + (row.completionTokens || 0);
            return (
              <tr
                key={`${row.rawModel}-${row.provider}`}
                className="border-b border-black/[0.03] dark:border-white/[0.03] last:border-b-0"
              >
                <td className="py-2 px-2 font-mono text-xs truncate max-w-[160px]" title={row.rawModel}>
                  {row.rawModel}
                </td>
                <td className="py-2 px-2 text-text-muted truncate max-w-[100px]" title={row.provider}>
                  {row.provider || "—"}
                </td>
                <td className="py-2 px-2 text-right font-mono" title={formatFull(row.requests)}>
                  {formatCompact(row.requests)}
                </td>
                <td className="py-2 px-2 text-right font-mono font-medium" title={formatFull(total)}>
                  {formatCompact(total)}
                </td>
                <td
                  className="py-2 px-2 text-right font-mono text-[11px] text-text-muted"
                  title={`${formatFull(row.promptTokens)} in · ${formatFull(row.completionTokens)} out`}
                >
                  {formatCompact(row.promptTokens)}·{formatCompact(row.completionTokens)}
                </td>
                <td className="py-2 px-2 text-right text-[11px] text-text-muted whitespace-nowrap">
                  {formatTime(row.lastUsed)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ProviderTable({ rows }) {
  if (!rows?.length) {
    return <p className="text-sm text-text-muted py-4 text-center">No provider usage in this period</p>;
  }
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full min-w-[360px] text-sm text-left">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-text-muted border-b border-black/5 dark:border-white/5">
            <th className="py-2 px-2 font-medium">Provider</th>
            <th className="py-2 px-2 font-medium text-right">Req</th>
            <th className="py-2 px-2 font-medium text-right">Tokens</th>
            <th className="py-2 px-2 font-medium text-right">In / Out</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const total = (row.promptTokens || 0) + (row.completionTokens || 0);
            return (
              <tr
                key={row.provider}
                className="border-b border-black/[0.03] dark:border-white/[0.03] last:border-b-0"
              >
                <td className="py-2 px-2 font-medium">{row.provider || "—"}</td>
                <td className="py-2 px-2 text-right font-mono">{formatCompact(row.requests)}</td>
                <td className="py-2 px-2 text-right font-mono font-medium">{formatCompact(total)}</td>
                <td className="py-2 px-2 text-right font-mono text-[11px] text-text-muted">
                  {formatCompact(row.promptTokens)}·{formatCompact(row.completionTokens)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function IpTable({ rows }) {
  if (!rows?.length) {
    return <p className="text-sm text-text-muted py-4 text-center">No client IPs recorded yet</p>;
  }
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full min-w-[360px] text-sm text-left">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-text-muted border-b border-black/5 dark:border-white/5">
            <th className="py-2 px-2 font-medium">IP</th>
            <th className="py-2 px-2 font-medium text-right">Req</th>
            <th className="py-2 px-2 font-medium text-right">Tokens</th>
            <th className="py-2 px-2 font-medium text-right">Last used</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const total = (row.promptTokens || 0) + (row.completionTokens || 0);
            return (
              <tr
                key={row.ip}
                className="border-b border-black/[0.03] dark:border-white/[0.03] last:border-b-0"
              >
                <td className="py-2 px-2 font-mono text-xs">{row.ip}</td>
                <td className="py-2 px-2 text-right font-mono">{formatCompact(row.requests)}</td>
                <td className="py-2 px-2 text-right font-mono font-medium" title={formatFull(total)}>
                  {formatCompact(total)}
                </td>
                <td className="py-2 px-2 text-right text-[11px] text-text-muted whitespace-nowrap">
                  {formatTime(row.lastUsed)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RecentTable({ rows }) {
  if (!rows?.length) {
    return <p className="text-sm text-text-muted py-4 text-center">No recent requests</p>;
  }
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full min-w-[560px] text-sm text-left">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-text-muted border-b border-black/5 dark:border-white/5">
            <th className="py-2 px-2 font-medium">Time</th>
            <th className="py-2 px-2 font-medium">Model</th>
            <th className="py-2 px-2 font-medium">Provider</th>
            <th className="py-2 px-2 font-medium">IP</th>
            <th className="py-2 px-2 font-medium text-right">In / Out</th>
            <th className="py-2 px-2 font-medium text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={`${row.timestamp}-${i}`}
              className="border-b border-black/[0.03] dark:border-white/[0.03] last:border-b-0"
            >
              <td className="py-2 px-2 text-[11px] text-text-muted whitespace-nowrap">
                {formatTime(row.timestamp)}
              </td>
              <td className="py-2 px-2 font-mono text-xs truncate max-w-[140px]" title={row.model}>
                {row.model}
              </td>
              <td className="py-2 px-2 text-text-muted truncate max-w-[90px]">{row.provider || "—"}</td>
              <td className="py-2 px-2 font-mono text-[11px] text-text-muted whitespace-nowrap">
                {row.clientIp || "—"}
              </td>
              <td className="py-2 px-2 text-right font-mono text-[11px]">
                {formatCompact(row.promptTokens)}·{formatCompact(row.completionTokens)}
              </td>
              <td className="py-2 px-2 text-right">
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    row.status === "ok" || row.status === "success"
                      ? "text-green-600"
                      : "text-red-500"
                  )}
                >
                  {row.status || "ok"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ApiKeyDetailDrawer({
  isOpen,
  onClose,
  loading,
  keyMeta,
  stats,
  periodLabel,
}) {
  const highlights = stats?.highlights || {};
  const byTokens = stats?.byModel
    ? [...stats.byModel].sort(
        (a, b) =>
          (b.promptTokens + b.completionTokens) - (a.promptTokens + a.completionTokens)
      )
    : [];

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={keyMeta?.name || "API Key"} width="xl">
      {loading ? (
        <div className="flex items-center justify-center py-16 text-text-muted gap-2">
          <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
          Loading usage…
        </div>
      ) : !stats ? (
        <p className="text-sm text-text-muted py-8 text-center">Failed to load usage details.</p>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
            <span className="px-2 py-0.5 rounded bg-black/5 dark:bg-white/5">
              Period: {periodLabel || "—"}
            </span>
            {keyMeta?.isActive === false && (
              <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-500">Paused</span>
            )}
            {keyMeta?.createdAt && (
              <span>Created {new Date(keyMeta.createdAt).toLocaleDateString()}</span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <StatCard
              label="Requests"
              value={formatCompact(stats.totalRequests)}
              title={formatFull(stats.totalRequests)}
            />
            <StatCard
              label="Total tokens"
              value={formatCompact(stats.totalTokens)}
              title={formatFull(stats.totalTokens)}
            />
            <StatCard
              label="Prompt / Completion"
              value={`${formatCompact(stats.totalPromptTokens)} / ${formatCompact(stats.totalCompletionTokens)}`}
              title={`${formatFull(stats.totalPromptTokens)} in · ${formatFull(stats.totalCompletionTokens)} out`}
            />
            <StatCard
              label="Cached"
              value={formatCompact(stats.totalCachedTokens)}
              title={formatFull(stats.totalCachedTokens)}
            />
            <StatCard
              label="Cost"
              value={stats.totalCost ? `$${Number(stats.totalCost).toFixed(4)}` : "—"}
            />
            <StatCard label="Last used" value={formatTime(stats.lastUsed)} />
            <StatCard
              label="Unique IPs"
              value={formatCompact(stats.uniqueIps ?? stats.byIp?.length ?? 0)}
              title={formatFull(stats.uniqueIps ?? stats.byIp?.length ?? 0)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <HighlightCard
              label="Most requested model"
              model={highlights.mostRequestedModel?.model}
              provider={highlights.mostRequestedModel?.provider}
              metricLabel="requests"
              metricValue={formatCompact(highlights.mostRequestedModel?.requests)}
            />
            <HighlightCard
              label="Most tokens model"
              model={highlights.mostTokensModel?.model}
              provider={highlights.mostTokensModel?.provider}
              metricLabel="tokens"
              metricValue={formatCompact(highlights.mostTokensModel?.totalTokens)}
            />
          </div>

          <section>
            <h3 className="text-sm font-semibold text-text-main mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-text-muted">model_training</span>
              Usage by model (by requests)
            </h3>
            <ModelTable rows={stats.byModel} emptyMessage="No model usage in this period" />
          </section>

          {byTokens.length > 1 && (
            <section>
              <h3 className="text-sm font-semibold text-text-main mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-text-muted">token</span>
                Usage by model (by tokens)
              </h3>
              <ModelTable rows={byTokens} emptyMessage="No model usage in this period" />
            </section>
          )}

          <section>
            <h3 className="text-sm font-semibold text-text-main mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-text-muted">dns</span>
              Usage by provider
            </h3>
            <ProviderTable rows={stats.byProvider} />
          </section>

          <section>
            <h3 className="text-sm font-semibold text-text-main mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-text-muted">lan</span>
              Clients by IP
            </h3>
            <IpTable rows={stats.byIp} />
          </section>

          <section>
            <h3 className="text-sm font-semibold text-text-main mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-text-muted">history</span>
              Recent requests
            </h3>
            <RecentTable rows={stats.recentRequests} />
          </section>
        </div>
      )}
    </Drawer>
  );
}
