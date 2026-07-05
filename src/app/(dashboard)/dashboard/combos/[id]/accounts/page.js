"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, notFound } from "next/navigation";
import { Card, Button, CardSkeleton } from "@/shared/components";
import { AI_PROVIDERS, resolveProviderId } from "@/shared/constants/providers";

function parseModelEntry(entry) {
  if (typeof entry !== "string") return { prefix: "", model: "" };
  const idx = entry.indexOf("/");
  if (idx < 0) return { prefix: entry, model: "" };
  return { prefix: entry.slice(0, idx), model: entry.slice(idx + 1) };
}

function getConnectionLabel(conn) {
  return conn.displayName || conn.name || conn.email || conn.id;
}

function resolveModelProvider(entry, providerNodes, aliases) {
  const { prefix, model } = parseModelEntry(entry);
  if (!prefix && aliases?.[entry]) return resolveModelProvider(aliases[entry], providerNodes, aliases);

  const node = providerNodes.find((n) => n.prefix === prefix);
  if (node) return { providerId: node.id, providerLabel: node.name || node.id, model };

  const providerId = resolveProviderId(prefix);
  const provider = AI_PROVIDERS[providerId];
  return { providerId, providerLabel: provider?.name || providerId, model };
}

export default function ComboAccountsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [combo, setCombo] = useState(null);
  const [connections, setConnections] = useState([]);
  const [providerNodes, setProviderNodes] = useState([]);
  const [aliases, setAliases] = useState({});
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [comboRes, providersRes, nodesRes, aliasesRes] = await Promise.all([
          fetch(`/api/combos/${id}`, { cache: "no-store" }),
          fetch("/api/providers", { cache: "no-store" }),
          fetch("/api/provider-nodes", { cache: "no-store" }),
          fetch("/api/models/alias", { cache: "no-store" }),
        ]);

        if (!comboRes.ok) {
          if (!cancelled) setCombo(null);
          return;
        }

        const comboData = await comboRes.json();
        const providersData = providersRes.ok ? await providersRes.json() : {};
        const nodesData = nodesRes.ok ? await nodesRes.json() : {};
        const aliasesData = aliasesRes.ok ? await aliasesRes.json() : {};

        if (!cancelled) {
          setCombo(comboData);
          setFilters(comboData.accountFilters || {});
          setConnections(providersData.connections || []);
          setProviderNodes(nodesData.nodes || []);
          setAliases(aliasesData.aliases || {});
        }
      } catch (error) {
        console.log("Error loading combo accounts:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  const setAllAccounts = (modelEntry) => {
    setFilters((prev) => {
      const next = { ...prev };
      delete next[modelEntry];
      return next;
    });
  };

  const setSkipped = (modelEntry) => {
    setFilters((prev) => ({ ...prev, [modelEntry]: [] }));
  };

  const toggleAccount = (modelEntry, connectionId, allConnectionIds) => {
    setFilters((prev) => {
      const hasFilter = Object.prototype.hasOwnProperty.call(prev, modelEntry);
      const selected = new Set(hasFilter ? (prev[modelEntry] || []) : allConnectionIds);
      if (selected.has(connectionId)) selected.delete(connectionId);
      else selected.add(connectionId);
      return { ...prev, [modelEntry]: Array.from(selected) };
    });
  };

  const save = async () => {
    if (!combo) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/combos/${combo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountFilters: filters }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to save account filters");
        return;
      }
      const updated = await res.json();
      setCombo(updated);
      setFilters(updated.accountFilters || {});
      router.push("/dashboard/combos");
    } catch (error) {
      console.log("Error saving account filters:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (!combo) return notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/dashboard/combos" className="text-text-muted hover:text-primary">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div className="min-w-0">
            <p className="text-sm text-text-muted">Combo Accounts</p>
            <code className="block truncate text-lg font-semibold">{combo.name}</code>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => router.push("/dashboard/combos")}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </div>
      </div>

      <Card>
        <p className="text-sm text-text-muted">
          Pick which provider accounts each combo model may use. No saved filter means all active accounts. Unchecking all accounts skips that model during combo execution.
        </p>
      </Card>

      {(combo.models || []).length === 0 ? (
        <Card>
          <div className="py-10 text-center text-sm text-text-muted">No models in this combo.</div>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {(combo.models || []).map((modelEntry, index) => {
            const resolved = resolveModelProvider(modelEntry, providerNodes, aliases);
            const accounts = connections.filter((conn) => conn.provider === resolved.providerId && conn.isActive !== false);
            const allIds = accounts.map((conn) => conn.id);
            const hasFilter = Object.prototype.hasOwnProperty.call(filters || {}, modelEntry);
            const selected = hasFilter ? (filters[modelEntry] || []) : allIds;
            const status = !hasFilter
              ? "All accounts"
              : selected.length === 0
                ? "Skipped"
                : `${selected.length} selected`;

            return (
              <Card key={`${modelEntry}-${index}`} padding="sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <code className="block truncate text-sm font-semibold">{modelEntry}</code>
                    <p className="mt-1 text-xs text-text-muted">
                      Provider: {resolved.providerLabel} <span className="font-mono">({resolved.providerId})</span>
                    </p>
                    <p className={`mt-1 text-xs ${hasFilter && selected.length === 0 ? "text-orange-500" : "text-text-muted"}`}>
                      Accounts: {status}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setAllAccounts(modelEntry)}>All Accounts</Button>
                    <Button size="sm" variant="ghost" onClick={() => setSkipped(modelEntry)} className="text-orange-500">Skip</Button>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-border">
                  {accounts.length === 0 ? (
                    <div className="p-4 text-sm text-text-muted">
                      No active accounts for provider <code>{resolved.providerId}</code>.
                    </div>
                  ) : accounts.map((conn) => (
                    <label key={conn.id} className="flex cursor-pointer items-center justify-between gap-3 border-b border-border p-3 last:border-b-0 hover:bg-black/5 dark:hover:bg-white/5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{getConnectionLabel(conn)}</p>
                        <p className="truncate text-xs text-text-muted">Priority {conn.priority || "-"} · {conn.authType}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={selected.includes(conn.id)}
                        onChange={() => toggleAccount(modelEntry, conn.id, allIds)}
                        className="shrink-0"
                      />
                    </label>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
