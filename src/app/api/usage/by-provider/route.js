import { NextResponse } from "next/server";
import { getUsageTotalsByProviders } from "@/lib/usageDb";
import { resolveProviderNames } from "./names.js";

export const dynamic = "force-dynamic";

const VALID_PERIODS = new Set(["today", "24h", "7d", "30d", "60d", "all"]);

// GET /api/usage/by-provider?period=&page=&pageSize=&search=
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "all";
    if (!VALID_PERIODS.has(period)) {
      return NextResponse.json({ error: "Invalid period" }, { status: 400 });
    }

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.max(1, Number(searchParams.get("pageSize")) || 10);
    const search = (searchParams.get("search") || "").trim().toLowerCase();

    // Only providers that actually have usageHistory rows, already sorted desc.
    const totals = await getUsageTotalsByProviders({ period });
    const names = await resolveProviderNames(totals.map((t) => t.provider));

    let rows = totals.map((t) => ({
      id: t.provider,
      name: names[t.provider] || t.provider,
      usage: {
        requests: t.requests,
        promptTokens: t.promptTokens,
        completionTokens: t.completionTokens,
        totalTokens: t.totalTokens,
        cost: t.cost,
        lastUsed: t.lastUsed,
      },
    }));

    if (search) {
      rows = rows.filter(
        (r) => r.name.toLowerCase().includes(search) || r.id.toLowerCase().includes(search)
      );
    }

    // Tens of rows, not thousands — page in memory and skip a second COUNT query.
    const total = rows.length;
    const start = (page - 1) * pageSize;

    return NextResponse.json({
      providers: rows.slice(start, start + pageSize),
      pagination: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    console.error("[API] Failed to list provider usage:", error);
    return NextResponse.json({ error: "Failed to fetch provider usage" }, { status: 500 });
  }
}
