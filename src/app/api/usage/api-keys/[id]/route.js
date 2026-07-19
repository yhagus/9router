import { NextResponse } from "next/server";
import { getApiKeyById } from "@/lib/localDb";
import { getUsageStatsForApiKey } from "@/lib/usageDb";

export const dynamic = "force-dynamic";

const VALID_PERIODS = new Set(["today", "24h", "7d", "30d", "60d", "all"]);

// GET /api/usage/api-keys/[id]?period=
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "all";
    if (!VALID_PERIODS.has(period)) {
      return NextResponse.json({ error: "Invalid period" }, { status: 400 });
    }

    const key = await getApiKeyById(id);
    if (!key) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    const stats = await getUsageStatsForApiKey(key.key, { period, recentLimit: 30 });

    return NextResponse.json({
      key: {
        id: key.id,
        name: key.name,
        isActive: key.isActive,
        createdAt: key.createdAt,
      },
      stats,
    });
  } catch (error) {
    console.error("[API] Failed to get API key usage detail:", error);
    return NextResponse.json({ error: "Failed to fetch API key usage detail" }, { status: 500 });
  }
}
