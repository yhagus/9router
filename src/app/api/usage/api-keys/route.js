import { NextResponse } from "next/server";
import { listApiKeys } from "@/lib/localDb";
import { getUsageTotalsByApiKeys } from "@/lib/usageDb";

export const dynamic = "force-dynamic";

const VALID_PERIODS = new Set(["today", "24h", "7d", "30d", "60d", "all"]);
const EMPTY_USAGE = {
  requests: 0,
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
  lastUsed: null,
};

// GET /api/usage/api-keys?period=&page=&pageSize=&search=
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "all";
    if (!VALID_PERIODS.has(period)) {
      return NextResponse.json({ error: "Invalid period" }, { status: 400 });
    }

    const page = Number(searchParams.get("page")) || 1;
    const pageSize = Number(searchParams.get("pageSize")) || 10;
    const search = searchParams.get("search") || "";

    const { keys, total, page: safePage, pageSize: safePageSize } = await listApiKeys({
      search,
      page,
      pageSize,
    });

    const usageMap = await getUsageTotalsByApiKeys(
      keys.map((k) => k.key),
      { period }
    );

    const keysWithUsage = keys.map((key) => ({
      id: key.id,
      name: key.name,
      key: key.key,
      isActive: key.isActive,
      createdAt: key.createdAt,
      usage: usageMap[key.key] || EMPTY_USAGE,
    }));

    return NextResponse.json({
      keys: keysWithUsage,
      pagination: {
        page: safePage,
        pageSize: safePageSize,
        totalItems: total,
        totalPages: Math.max(1, Math.ceil(total / safePageSize)),
      },
    });
  } catch (error) {
    console.error("[API] Failed to list API key usage:", error);
    return NextResponse.json({ error: "Failed to fetch API key usage" }, { status: 500 });
  }
}
