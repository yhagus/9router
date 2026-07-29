import { NextResponse } from "next/server";
import { getProviderConnections, listApiKeys } from "@/lib/localDb";
import { getUsageStatsForProvider } from "@/lib/usageDb";
import { resolveProviderNames } from "../names.js";

export const dynamic = "force-dynamic";

const VALID_PERIODS = new Set(["today", "24h", "7d", "30d", "60d", "all"]);

// GET /api/usage/by-provider/[id]?period=
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "all";
    if (!VALID_PERIODS.has(period)) {
      return NextResponse.json({ error: "Invalid period" }, { status: 400 });
    }

    const stats = await getUsageStatsForProvider(id, { period, recentLimit: 30 });
    if (!stats.totalRequests) {
      return NextResponse.json({ error: "Provider usage not found" }, { status: 404 });
    }

    // Label the raw ids server-side so the drawer stays presentational.
    const connections = await getProviderConnections();
    const connLabels = {};
    for (const c of connections) connLabels[c.id] = c.name || c.email || null;

    const { keys } = await listApiKeys({ page: 1, pageSize: 1000 });
    const keyLabels = {};
    for (const k of keys) keyLabels[k.key] = k.name || null;

    stats.byAccount = stats.byAccount.map((row) => ({
      ...row,
      label: connLabels[row.connectionId] || row.connectionId,
    }));
    stats.byApiKey = stats.byApiKey.map((row) => ({
      ...row,
      label: keyLabels[row.apiKey] || row.apiKey,
    }));

    const names = await resolveProviderNames([id]);

    return NextResponse.json({ provider: { id, name: names[id] || id }, stats });
  } catch (error) {
    console.error("[API] Failed to get provider usage detail:", error);
    return NextResponse.json({ error: "Failed to fetch provider usage detail" }, { status: 500 });
  }
}
