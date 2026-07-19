import { NextResponse } from "next/server";
import { getApiKeys, listApiKeys, createApiKey } from "@/lib/localDb";
import { normalizeApiKeyVisibility } from "@/shared/utils/apiKeyVisibility";
import { getUsageTotalsByApiKeys } from "@/lib/usageDb";
import { getConsistentMachineId } from "@/shared/utils/machineId";

export const dynamic = "force-dynamic";

const EMPTY_USAGE = { requests: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 };

function hasPaginationParams(searchParams) {
  return searchParams.has("page") || searchParams.has("pageSize") || searchParams.has("search") || searchParams.has("visibility");
}

async function attachUsage(keys) {
  const usageMap = await getUsageTotalsByApiKeys(keys.map((k) => k.key));
  return keys.map((key) => ({
    ...key,
    usage: usageMap[key.key] || EMPTY_USAGE,
  }));
}

// GET /api/keys - List API keys
// With page/pageSize/search/visibility → paginated response + per-key usage totals
// Without those params → full list (backward compatible for dropdowns/CLI)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    if (hasPaginationParams(searchParams)) {
      const page = Number(searchParams.get("page")) || 1;
      const pageSize = Number(searchParams.get("pageSize")) || 10;
      const search = searchParams.get("search") || "";
      const visibilityParam = searchParams.get("visibility");
      const visibility = visibilityParam === "public" || visibilityParam === "private"
        ? visibilityParam
        : undefined;
      const { keys, total, page: safePage, pageSize: safePageSize } = await listApiKeys({
        search,
        page,
        pageSize,
        visibility,
      });
      const keysWithUsage = await attachUsage(keys);
      return NextResponse.json({
        keys: keysWithUsage,
        pagination: {
          page: safePage,
          pageSize: safePageSize,
          totalItems: total,
          totalPages: Math.max(1, Math.ceil(total / safePageSize)),
        },
      });
    }

    const keys = await getApiKeys();
    return NextResponse.json({ keys });
  } catch (error) {
    console.log("Error fetching keys:", error);
    return NextResponse.json({ error: "Failed to fetch keys" }, { status: 500 });
  }
}

// POST /api/keys - Create new API key
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, visibility, isDefault } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Always get machineId from server
    const machineId = await getConsistentMachineId();
    const vis = normalizeApiKeyVisibility(visibility);
    const apiKey = await createApiKey(name, machineId, {
      visibility: vis,
      isDefault: vis === "public" && isDefault === true,
    });

    return NextResponse.json({
      key: apiKey.key,
      name: apiKey.name,
      id: apiKey.id,
      machineId: apiKey.machineId,
      visibility: apiKey.visibility,
      isDefault: apiKey.isDefault === true,
    }, { status: 201 });
  } catch (error) {
    console.log("Error creating key:", error);
    return NextResponse.json({ error: "Failed to create key" }, { status: 500 });
  }
}
