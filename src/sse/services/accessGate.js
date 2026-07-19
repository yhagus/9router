import { getApiKeyByKey, getSettings } from "@/lib/localDb";
import { errorResponse } from "open-sse/utils/error.js";
import { HTTP_STATUS } from "open-sse/config/runtimeConfig.js";

function canUse(mode, list, value, defaultMode) {
  const accessMode = mode === "whitelist" || mode === "blacklist" ? mode : defaultMode;
  const accessList = Array.isArray(list) ? list : [];
  const listed = accessList.includes(value);
  return accessMode === "whitelist" ? listed : !listed;
}

export function canUseCombo(apiKeyRecord, comboName) {
  return canUse(apiKeyRecord?.comboAccessMode, apiKeyRecord?.comboAccessList, comboName, "blacklist");
}

export function canUseModel(apiKeyRecord, modelId) {
  return canUse(apiKeyRecord?.modelAccessMode, apiKeyRecord?.modelAccessList, modelId, "whitelist");
}

/**
 * Lifetime usage limit check (requests or tokens).
 * @returns {Response|null} 429 response if over limit, else null
 */
export function checkUsageLimit(apiKeyRecord) {
  if (!apiKeyRecord) return null;
  const mode = apiKeyRecord.limitMode;
  const limit = apiKeyRecord.limitValue;
  if (!mode || mode === "none" || limit == null || limit <= 0) return null;

  const usage =
    mode === "tokens"
      ? Number(apiKeyRecord.usageTokens) || 0
      : Number(apiKeyRecord.usageRequests) || 0;

  if (usage < limit) return null;

  return errorResponse(
    HTTP_STATUS.RATE_LIMITED,
    `API key usage limit exceeded (${mode}: ${usage}/${limit})`
  );
}

export async function getApiKeyRecordForRequest(request, log, tag = "AUTH") {
  const settings = await getSettings();
  const apiKey = extractApiKeyLike(request);
  let apiKeyRecord = null;

  if (settings.requireApiKey) {
    if (!apiKey) {
      log?.warn?.(tag, "Missing API key (requireApiKey=true)");
      return { settings, apiKey, error: errorResponse(HTTP_STATUS.UNAUTHORIZED, "Missing API key") };
    }
    apiKeyRecord = await getApiKeyByKey(apiKey);
    if (!apiKeyRecord?.isActive) {
      log?.warn?.(tag, "Invalid API key (requireApiKey=true)");
      return { settings, apiKey, error: errorResponse(HTTP_STATUS.UNAUTHORIZED, "Invalid API key") };
    }
  } else if (apiKey) {
    apiKeyRecord = await getApiKeyByKey(apiKey);
    if (apiKeyRecord && apiKeyRecord.isActive === false) {
      log?.warn?.(tag, "Inactive API key");
      return { settings, apiKey, error: errorResponse(HTTP_STATUS.UNAUTHORIZED, "Invalid API key") };
    }
  }

  if (apiKeyRecord) {
    const limitError = checkUsageLimit(apiKeyRecord);
    if (limitError) {
      log?.warn?.(tag, "API key usage limit exceeded", {
        mode: apiKeyRecord.limitMode,
        limit: apiKeyRecord.limitValue,
      });
      return { settings, apiKey, apiKeyRecord, error: limitError };
    }
  }

  return { settings, apiKey, apiKeyRecord };
}

export function blockModelIfNeeded(apiKeyRecord, canonicalModelId) {
  if (!apiKeyRecord || canUseModel(apiKeyRecord, canonicalModelId)) return null;
  return errorResponse(HTTP_STATUS.FORBIDDEN, `Model not allowed for this API key: ${canonicalModelId}`);
}

function extractApiKeyLike(request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  return request.headers.get("x-api-key") || null;
}
