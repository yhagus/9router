import { NextResponse } from "next/server";
import { getDefaultPublicApiKey, getCombos } from "@/lib/localDb";
import { canUseCombo } from "@/sse/services/accessGate";

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

    // Combos usable by the default public key (minimal public shape: name + kind)
    const combos = key
      ? (await getCombos())
          .filter((combo) => canUseCombo(key, combo.name))
          .map((combo) => ({ name: combo.name, kind: combo.kind || null }))
      : [];

    return NextResponse.json({
      basePath: "/v1",
      keys,
      combos,
    });
  } catch (error) {
    console.log("Error fetching public connect info:", error);
    return NextResponse.json({ error: "Failed to fetch connect info" }, { status: 500 });
  }
}
