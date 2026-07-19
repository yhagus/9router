import { NextResponse } from "next/server";
import { getDefaultPublicApiKey } from "@/lib/localDb";

export const dynamic = "force-dynamic";

// GET /api/connect — public default API key only (no auth)
export async function GET() {
  try {
    const key = await getDefaultPublicApiKey();
    const keys = key
      ? [{
          id: key.id,
          name: key.name,
          key: key.key,
          limitMode: key.limitMode || "none",
          limitValue: key.limitValue ?? null,
          usageRequests: key.usageRequests || 0,
          usageTokens: key.usageTokens || 0,
        }]
      : [];

    return NextResponse.json({
      basePath: "/v1",
      keys,
    });
  } catch (error) {
    console.log("Error fetching public connect info:", error);
    return NextResponse.json({ error: "Failed to fetch connect info" }, { status: 500 });
  }
}
