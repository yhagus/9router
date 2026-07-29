"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Input, Pagination } from "@/shared/components";
import { formatCompact } from "@/shared/utils";
import ProviderDetailDrawer from "./ProviderDetailDrawer";

const EMPTY_USAGE = {
  requests: 0,
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
  lastUsed: null,
};

const PERIOD_LABELS = {
  today: "Today",
  "24h": "24h",
  "7d": "7D",
  "30d": "30D",
  "60d": "60D",
  all: "All Time",
};

function formatRelative(iso) {
  if (!iso) return "Never";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = Date.now() - t;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 30 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function ProvidersTab({ period = "all" }) {
  const [providers, setProviders] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [detailStats, setDetailStats] = useState(null);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        period,
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/usage/by-provider?${params}`);
      const data = await res.json();
      if (res.ok) {
        setProviders(data.providers || []);
        if (data.pagination) {
          setPagination(data.pagination);
          if (data.pagination.page !== page) setPage(data.pagination.page);
        }
      }
    } catch (error) {
      console.error("Failed to fetch provider usage:", error);
    } finally {
      setLoading(false);
    }
  }, [period, page, pageSize, search]);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch((prev) => {
        const next = searchInput;
        if (prev !== next) setPage(1);
        return next;
      });
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [period]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const openDetails = (provider) => {
    setSelectedProvider(provider);
    setDetailStats(null);
    setDrawerOpen(true);
  };

  useEffect(() => {
    if (!drawerOpen || !selectedProvider?.id) return;
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      try {
        const res = await fetch(
          `/api/usage/by-provider/${encodeURIComponent(selectedProvider.id)}?period=${period}`
        );
        const data = await res.json();
        if (!cancelled && res.ok) {
          setSelectedProvider((prev) => (prev ? { ...prev, ...data.provider } : prev));
          setDetailStats(data.stats);
        }
      } catch (error) {
        console.error("Failed to fetch provider detail:", error);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [period, drawerOpen, selectedProvider?.id]);

  const hasProviders = providers.length > 0;
  const hasSearch = Boolean(searchInput?.trim());

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Card padding="md">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-text-main flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">dns</span>
                Provider usage
                {pagination.totalItems > 0 && (
                  <span className="text-sm font-normal text-text-muted">
                    ({pagination.totalItems})
                  </span>
                )}
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Token and request totals for the selected period. Open a provider for model, account and key breakdown.
              </p>
            </div>
            <div className="w-full sm:w-64">
              <Input
                icon="search"
                placeholder="Search by provider..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                inputClassName="py-2"
              />
            </div>
          </div>

          {loading && !hasProviders ? (
            <div className="flex items-center justify-center py-12 text-text-muted gap-2">
              <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
              Loading…
            </div>
          ) : !hasProviders ? (
            <div className="text-center py-10">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-3">
                <span className="material-symbols-outlined text-[24px]">dns</span>
              </div>
              <p className="text-text-main font-medium mb-1">
                {hasSearch ? "No matching providers" : "No provider usage yet"}
              </p>
              <p className="text-sm text-text-muted">
                {hasSearch
                  ? "Try a different name or clear the search"
                  : "Send a request through the gateway to start tracking provider usage"}
              </p>
            </div>
          ) : (
            <>
              <div className={`overflow-x-auto -mx-1 ${loading ? "opacity-60" : ""}`}>
                <table className="w-full min-w-[600px] text-left">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-text-muted border-b border-black/5 dark:border-white/5">
                      <th className="py-2 px-2 font-medium w-[36%]">Provider</th>
                      <th className="py-2 px-2 font-medium w-[20%] text-right">Tokens</th>
                      <th className="py-2 px-2 font-medium w-[12%] text-right">Req</th>
                      <th className="py-2 px-2 font-medium w-[16%] text-right">Last used</th>
                      <th className="py-2 px-2 font-medium w-[16%] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {providers.map((provider) => {
                      const usage = provider.usage || EMPTY_USAGE;
                      const totalTitle = `${(usage.totalTokens || 0).toLocaleString()} total · ${(usage.promptTokens || 0).toLocaleString()} in · ${(usage.completionTokens || 0).toLocaleString()} out`;

                      return (
                        <tr
                          key={provider.id}
                          className="border-b border-black/[0.03] dark:border-white/[0.03] last:border-b-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                        >
                          <td className="py-2.5 px-2 align-middle">
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate" title={provider.name}>
                                {provider.name}
                              </div>
                              {provider.name !== provider.id && (
                                <div className="text-[10px] font-mono text-text-muted truncate">
                                  {provider.id}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 align-middle text-right" title={totalTitle}>
                            <div className="text-sm font-mono font-medium text-text-main">
                              {formatCompact(usage.totalTokens)}
                            </div>
                            <div className="text-[10px] font-mono text-text-muted">
                              {formatCompact(usage.promptTokens)} in · {formatCompact(usage.completionTokens)} out
                            </div>
                          </td>
                          <td className="py-2.5 px-2 align-middle text-right">
                            <span
                              className="text-sm font-mono"
                              title={`${(usage.requests || 0).toLocaleString()} requests`}
                            >
                              {formatCompact(usage.requests)}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 align-middle text-right text-xs text-text-muted whitespace-nowrap">
                            {formatRelative(usage.lastUsed)}
                          </td>
                          <td className="py-2.5 px-2 align-middle text-right">
                            <button
                              type="button"
                              onClick={() => openDetails(provider)}
                              className="inline-flex items-center justify-center p-1.5 rounded-lg border border-black/10 dark:border-white/10 text-text-muted hover:text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                              title="Details"
                              aria-label="View details"
                            >
                              <span className="material-symbols-outlined text-[18px]">info</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {pagination.totalItems > 0 && (
                <Pagination
                  currentPage={pagination.page}
                  pageSize={pagination.pageSize}
                  totalItems={pagination.totalItems}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                  className="py-2 px-0"
                />
              )}
            </>
          )}
        </div>
      </Card>

      <ProviderDetailDrawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setDetailStats(null);
          setSelectedProvider(null);
        }}
        loading={detailLoading}
        providerMeta={selectedProvider}
        stats={detailStats}
        periodLabel={PERIOD_LABELS[period] || period}
      />
    </div>
  );
}
