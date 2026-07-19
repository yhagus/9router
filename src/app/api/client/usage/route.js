import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getApiKeyById, getModelAliases, getProviderConnections, getProviderNodes } from "@/lib/localDb";
import { getClientAuthSession } from "@/lib/auth/dashboardSession";
import { getUsageStatsForApiKey } from "@/lib/usageDb";
import { canUseCombo } from "@/sse/services/accessGate";
import { getCombos } from "@/lib/db/index.js";
import { resolveProviderId, USAGE_APIKEY_PROVIDERS, USAGE_SUPPORTED_PROVIDERS } from "@/shared/constants/providers";
import { GET as getUsageForConnection } from "@/app/api/usage/[connectionId]/route";

export const dynamic = "force-dynamic";

function parseModelEntry(entry) {
  if (typeof entry !== "string") return { prefix: "", model: "" };
  const idx = entry.indexOf("/");
  if (idx < 0) return { prefix: entry, model: "" };
  return { prefix: entry.slice(0, idx), model: entry.slice(idx + 1) };
}

function resolveModelProvider(entry, providerNodes, aliases) {
  const { prefix } = parseModelEntry(entry);
  if (!prefix && aliases?.[entry]) return resolveModelProvider(aliases[entry], providerNodes, aliases);

  const node = providerNodes.find((n) => n.prefix === prefix);
  if (node) return node.id;
  return resolveProviderId(prefix);
}

function isUsageEligible(connection) {
  const isApikeyAuth = connection.authType === "apikey" || connection.authType === "api_key";
  return USAGE_SUPPORTED_PROVIDERS.includes(connection.provider)
    && (connection.authType === "oauth" || (isApikeyAuth && USAGE_APIKEY_PROVIDERS.includes(connection.provider)));
}

function safeAccountName(connection, index) {
  const label = connection.displayName?.trim() || connection.name?.trim();
  if (!label || label.includes("@")) return `Account ${index + 1}`;
  return label;
}

function normalizeQuotas(provider, data) {
  if (!data?.quotas || typeof data.quotas !== "object") return [];
  return Object.entries(data.quotas)
    .filter(([name, quota]) => !(provider === "qoder" && name === "organization" && (!quota || (Number(quota.total) || 0) === 0)))
    .map(([name, quota]) => ({
      name: quota.displayName || (provider === "qoder" && name === "user" ? "Personal" : provider === "qoder" && name === "organization" ? "Organization" : name),
      used: quota.used || 0,
      total: quota.total || 0,
      remaining: quota.remaining,
      remainingPercentage: quota.remainingPercentage,
      resetAt: quota.resetAt || null,
      recurring: quota.recurring !== false,
    }));
}

async function fetchGuestQuota(connection) {
  if (!isUsageEligible(connection)) return null;
  try {
    const response = await getUsageForConnection(new Request("http://localhost/api/usage"), { params: Promise.resolve({ connectionId: connection.id }) });
    if (!response.ok) return null;
    const data = await response.json();
    const quotas = normalizeQuotas(connection.provider, data);
    return quotas.length ? quotas : null;
  } catch {
    return null;
  }
}

async function buildAvailableLlms(key) {
  const [combos, connections, providerNodes, aliases] = await Promise.all([
    getCombos(),
    getProviderConnections(),
    getProviderNodes(),
    getModelAliases(),
  ]);
  const activeConnections = connections.filter((conn) => conn.isActive !== false);
  const allowedCombos = combos.filter((combo) => canUseCombo(key, combo.name));

  return await Promise.all(allowedCombos.map(async (combo) => {
    const accountIds = [];
    for (const modelEntry of combo.models || []) {
      const providerId = resolveModelProvider(modelEntry, providerNodes, aliases);
      const providerAccounts = activeConnections.filter((conn) => conn.provider === providerId);
      const allIds = providerAccounts.map((conn) => conn.id);
      const hasFilter = Object.prototype.hasOwnProperty.call(combo.accountFilters || {}, modelEntry);
      const selectedIds = hasFilter ? (combo.accountFilters?.[modelEntry] || []) : allIds;
      for (const id of selectedIds) if (!accountIds.includes(id)) accountIds.push(id);
    }

    const accounts = await Promise.all(accountIds.map(async (id, index) => {
      const connection = activeConnections.find((conn) => conn.id === id);
      if (!connection) return null;
      return {
        id: connection.id,
        name: safeAccountName(connection, index),
        quotas: await fetchGuestQuota(connection),
      };
    }));

    return { id: combo.id, name: combo.name, accounts: accounts.filter(Boolean) };
  }));
}

export async function GET() {
  const cookieStore = await cookies();
  const session = await getClientAuthSession(cookieStore.get("client_auth_token")?.value);
  if (!session?.apiKeyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const key = await getApiKeyById(session.apiKeyId);
  if (!key?.isActive || key.visibility === "public") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const [stats, availableCombos] = await Promise.all([
    getUsageStatsForApiKey(key.key),
    buildAvailableLlms(key),
  ]);

  return NextResponse.json({ key: { id: key.id, name: key.name || "API Key" }, stats, availableCombos }, { headers: { "Cache-Control": "no-store" } });
}
