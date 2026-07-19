import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getApiKeyById } from "@/lib/localDb";
import { getClientAuthSession } from "@/lib/auth/dashboardSession";

export async function GET() {
  const cookieStore = await cookies();
  const session = await getClientAuthSession(cookieStore.get("client_auth_token")?.value);
  if (!session?.apiKeyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const key = await getApiKeyById(session.apiKeyId);
  if (!key?.isActive || key.visibility === "public") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json({ key: { id: key.id, name: key.name || "API Key" } }, { headers: { "Cache-Control": "no-store" } });
}
