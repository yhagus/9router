import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/localDb";
import {
  buildFreeTrackerSources,
  PRICING_URL,
} from "@/lib/freeTracker/buildSources";
import { nextFreeTrackerPublicMap } from "@/lib/freeTracker/visibility";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getSettings();
    const data = await buildFreeTrackerSources(settings, { publicOnly: false });
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const message = err?.name === "AbortError"
      ? "Timed out fetching InferHub pricing"
      : err?.message || "Failed to fetch free model quotas";
    return NextResponse.json(
      {
        error: message,
        sources: [],
        pools: [],
        source: "inferhub",
        sourceUrl: PRICING_URL,
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

/**
 * PATCH { sourceId, publicVisible: boolean }
 * Toggles whether a Free Tracker source card is visible on /client/free-tracker.
 */
export async function PATCH(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const sourceId = typeof body.sourceId === "string" ? body.sourceId.trim() : "";
    if (!sourceId) {
      return NextResponse.json({ error: "sourceId is required" }, { status: 400 });
    }
    if (typeof body.publicVisible !== "boolean") {
      return NextResponse.json({ error: "publicVisible must be a boolean" }, { status: 400 });
    }

    const settings = await getSettings();
    const freeTrackerPublic = nextFreeTrackerPublicMap(
      settings.freeTrackerPublic,
      sourceId,
      body.publicVisible,
    );
    const next = await updateSettings({ freeTrackerPublic });

    return NextResponse.json(
      {
        sourceId,
        publicVisible: body.publicVisible,
        freeTrackerPublic: next.freeTrackerPublic || {},
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Failed to update visibility" },
      { status: 500 },
    );
  }
}
