import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createProviderConnection } from "@/models";
import { QoderService } from "@/lib/oauth/services/qoder";

/**
 * POST /api/oauth/qoder/bulk-import
 * Bulk import Qoder accounts.
 *
 * Body: { accounts: [ Account ] }
 *
 * Account shapes (either):
 *   1. Device token (browser flow result):
 *      { deviceToken, userId, machineId?, name? }
 *   2. Personal Access Token (qodercli PAT path):
 *      { pat } or { personalAccessToken }
 *      userId / name / email optional — filled from exchange + userinfo
 *
 * PATs are NEVER stored as accessToken. They are exchanged via
 * POST /api/v1/jobToken/exchange → session token for COSY, and the raw
 * PAT is kept in providerSpecificData.personalAccessToken for re-exchange.
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
  const svc = new QoderService();

  // SERIAL loop — createProviderConnection reads max(priority) and reorders
  // inside a transaction. Parallel calls would race on priority assignment.
  for (let i = 0; i < accounts.length; i++) {
    const raw = accounts[i];
    try {
      if (!raw || typeof raw !== "object") {
        throw new Error("Item is not an object");
      }

      const pat = String(
        raw.pat || raw.personalAccessToken || raw.personal_access_token || "",
      ).trim();
      const deviceToken = String(raw.deviceToken || raw.accessToken || "").trim();
      const machineId = String(raw.machineId || "").trim() || uuidv4();

      let accessToken;
      let refreshToken = null;
      let expiresAt = null;
      let userId = String(raw.userId || raw.uid || "").trim();
      let name = raw.name || null;
      let email = raw.email || null;
      let organizationId = "";
      let authMethod = "device";
      let personalAccessToken = null;

      if (pat) {
        // qodercli path: exchange PAT → session token, never put pt- into COSY
        const exchanged = await svc.loginWithPAT(pat);
        accessToken = exchanged.accessToken;
        refreshToken = exchanged.refreshToken || null;
        expiresAt = exchanged.expireTime
          ? new Date(exchanged.expireTime).toISOString()
          : null;
        userId = userId || exchanged.userId || "";
        name = name || exchanged.name || null;
        email = email || exchanged.email || null;
        organizationId = exchanged.organizationId || "";
        personalAccessToken = exchanged.personalAccessToken;
        authMethod = "pat";

        if (!userId) {
          throw new Error("PAT exchange succeeded but userId is missing (userinfo failed)");
        }
      } else if (deviceToken) {
        if (!userId) throw new Error("Missing userId (required with deviceToken)");
        accessToken = deviceToken;
        authMethod = "device";
      } else {
        throw new Error("Missing pat or deviceToken");
      }

      // Dedup key: createProviderConnection matches oauth by email. Prefer real
      // email; fall back to stable synthetic id from userId (same as device flow).
      const connectionEmail =
        (email && String(email).trim()) ||
        (userId ? `qoder-user-${userId}` : null);

      const created = await createProviderConnection({
        provider: "qoder",
        authType: "oauth",
        accessToken,
        refreshToken,
        expiresAt,
        name: name || `Qoder ${i + 1}`,
        email: connectionEmail,
        displayName: name || null,
        providerSpecificData: {
          authMethod,
          userId,
          machineId,
          organizationId,
          ...(personalAccessToken ? { personalAccessToken } : {}),
        },
        testStatus: "unknown",
        isActive: true,
      });

      results.push({ index: i, ok: true, id: created.id, authMethod });
      success++;
    } catch (e) {
      results.push({ index: i, ok: false, error: e.message || "Unknown error" });
      failed++;
    }
  }

  return NextResponse.json({ success, failed, results });
}
