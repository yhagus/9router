import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createProviderConnection } from "@/models";

/**
 * POST /api/oauth/qoder/bulk-import
 * Bulk import Qoder device-token accounts.
 *
 * Body: { accounts: [{ deviceToken, userId, machineId? }] }
 *
 * Each entry creates a connection with authType "oauth" so the runtime
 * credential resolver maps accessToken / providerSpecificData exactly
 * like the browser device-flow does.
 *
 * Tokens are NEVER echoed back in the response.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json(
      { error: `Invalid JSON body: ${err.message}` },
      { status: 400 },
    );
  }

  const accounts = Array.isArray(body?.accounts) ? body.accounts : null;
  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ error: "No accounts provided" }, { status: 400 });
  }

  const results = [];
  let success = 0;
  let failed = 0;

  // SERIAL loop — createProviderConnection reads max(priority) and reorders
  // inside a transaction. Parallel calls would race on priority assignment.
  for (let i = 0; i < accounts.length; i++) {
    const raw = accounts[i];
    try {
      if (!raw || typeof raw !== "object") {
        throw new Error("Item is not an object");
      }

      const deviceToken = (raw.deviceToken || "").trim();
      const userId = (raw.userId || "").trim();
      const machineId = (raw.machineId || "").trim() || uuidv4();

      if (!deviceToken) throw new Error("Missing deviceToken");
      if (!userId) throw new Error("Missing userId");

      const created = await createProviderConnection({
        provider: "qoder",
        authType: "oauth",
        accessToken: deviceToken,
        name: raw.name || `Qoder ${i + 1}`,
        providerSpecificData: { userId, machineId },
        testStatus: "unknown",
        isActive: true,
      });

      results.push({ index: i, ok: true, id: created.id });
      success++;
    } catch (e) {
      results.push({ index: i, ok: false, error: e.message || "Unknown error" });
      failed++;
    }
  }

  return NextResponse.json({ success, failed, results });
}
