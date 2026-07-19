import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getApiKeyById } from "@/lib/localDb";
import { getClientAuthSession } from "@/lib/auth/dashboardSession";
import { getSettings } from "@/lib/localDb";
import {
  buildFreeTrackerSources,
  PRICING_URL,
} from "@/lib/freeTracker/buildSources";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const session = await getClientAuthSession(cookieStore.get("client_auth_token")?.value);
  if (!session?.apiKeyId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const key = await getApiKeyById(session.apiKeyId);
  if (!key?.isActive || key.visibility === "public") {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const settings = await getSettings();
    const data = await buildFreeTrackerSources(settings, { publicOnly: true });
    // Client payload: only public sources (no admin-only fields needed)
    return NextResponse.json(
      {
        sources: data.sources,
        fetchedAt: data.fetchedAt,
        cached: data.cached,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const message = err?.name === "AbortError"
      ? "Timed out fetching free model quotas"
      : err?.message || "Failed to fetch free model quotas";
    return NextResponse.json(
      {
        error: message,
        sources: [],
        sourceUrl: PRICING_URL,
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
