import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getApiKeyByKey } from "@/lib/localDb";
import { setClientAuthCookie } from "@/lib/auth/dashboardSession";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function POST(request) {
  try {
    const { apiKey } = await request.json();
    const key = await getApiKeyByKey(apiKey);
    if (!key?.isActive) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401, headers: NO_STORE_HEADERS });
    }

    const cookieStore = await cookies();
    await setClientAuthCookie(cookieStore, request, {
      apiKeyId: key.id,
      apiKeyName: key.name || "API Key",
    });

    return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
