import { v4 as uuidv4 } from "uuid";
import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";
import { normalizeApiKeyVisibility, isApiKeyPublic } from "@/shared/utils/apiKeyVisibility";

export { normalizeApiKeyVisibility, isApiKeyPublic };

const COMBO_ACCESS_MODES = new Set(["blacklist", "whitelist"]);
const LIMIT_MODES = new Set(["none", "requests", "tokens"]);

function normalizeComboAccessMode(mode) {
  return COMBO_ACCESS_MODES.has(mode) ? mode : "blacklist";
}

function normalizeModelAccessMode(mode) {
  return COMBO_ACCESS_MODES.has(mode) ? mode : "whitelist";
}

function normalizeComboAccessList(list) {
  return Array.isArray(list)
    ? Array.from(new Set(list.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim())))
    : [];
}

const normalizeModelAccessList = normalizeComboAccessList;

export function normalizeLimitMode(mode) {
  return LIMIT_MODES.has(mode) ? mode : "none";
}

export function normalizeLimitValue(mode, value) {
  const m = normalizeLimitMode(mode);
  if (m === "none") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

function rowToKey(row) {
  if (!row) return null;
  const visibility = normalizeApiKeyVisibility(row.visibility);
  const isDefault =
    visibility === "public" && (row.isDefault === 1 || row.isDefault === true);
  const limitMode = normalizeLimitMode(row.limitMode);
  const limitValue = normalizeLimitValue(limitMode, row.limitValue);
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    machineId: row.machineId,
    isActive: row.isActive === 1 || row.isActive === true,
    comboAccessMode: normalizeComboAccessMode(row.comboAccessMode),
    comboAccessList: normalizeComboAccessList(parseJson(row.comboAccessList, [])),
    modelAccessMode: normalizeModelAccessMode(row.modelAccessMode),
    modelAccessList: normalizeModelAccessList(parseJson(row.modelAccessList, [])),
    visibility,
    isDefault,
    limitMode: limitValue == null ? "none" : limitMode,
    limitValue,
    usageRequests: Number(row.usageRequests) || 0,
    usageTokens: Number(row.usageTokens) || 0,
    createdAt: row.createdAt,
  };
}

/** SQL fragment: private = not public (null/empty/other count as private). */
function visibilityWhere(visibility) {
  const v = normalizeApiKeyVisibility(visibility);
  if (v === "public") {
    return { clause: `visibility = 'public'`, params: [] };
  }
  return {
    clause: `(visibility IS NULL OR visibility = '' OR visibility != 'public')`,
    params: [],
  };
}

function clearAllDefaults(db) {
  db.run(`UPDATE apiKeys SET isDefault = 0 WHERE isDefault = 1`);
}

export async function getApiKeys() {
  const db = await getAdapter();
  const rows = db.all(`SELECT * FROM apiKeys ORDER BY createdAt ASC`);
  return rows.map(rowToKey);
}

/**
 * Paginated API keys list with optional name search and visibility filter.
 * @param {{ search?: string, page?: number, pageSize?: number, visibility?: 'private'|'public' }} opts
 * @returns {Promise<{ keys: object[], total: number, page: number, pageSize: number }>}
 */
export async function listApiKeys({ search = "", page = 1, pageSize = 10, visibility } = {}) {
  const db = await getAdapter();
  const safePageSize = Math.min(50, Math.max(1, Number(pageSize) || 10));
  const q = String(search || "").trim().toLowerCase();
  const vis = visibility != null && visibility !== ""
    ? visibilityWhere(visibility)
    : null;

  const whereParts = [];
  const whereParams = [];
  if (vis) {
    whereParts.push(vis.clause);
    whereParams.push(...vis.params);
  }
  if (q) {
    whereParts.push(`LOWER(name) LIKE ?`);
    whereParams.push(`%${q}%`);
  }
  const whereSql = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

  const countRow = db.get(`SELECT COUNT(*) as count FROM apiKeys ${whereSql}`, whereParams);
  const total = countRow?.count ?? 0;

  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const offset = (safePage - 1) * safePageSize;

  const rows = db.all(
    `SELECT * FROM apiKeys ${whereSql} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
    [...whereParams, safePageSize, offset]
  );

  return {
    keys: rows.map(rowToKey),
    total,
    page: safePage,
    pageSize: safePageSize,
  };
}

export async function getApiKeyById(id) {
  const db = await getAdapter();
  const row = db.get(`SELECT * FROM apiKeys WHERE id = ?`, [id]);
  return rowToKey(row);
}

export async function getApiKeyByKey(key) {
  const db = await getAdapter();
  const row = db.get(`SELECT * FROM apiKeys WHERE key = ?`, [key]);
  return rowToKey(row);
}

/** Active public key marked as default (for /connect). */
export async function getDefaultPublicApiKey() {
  const db = await getAdapter();
  const row = db.get(
    `SELECT * FROM apiKeys WHERE visibility = 'public' AND isDefault = 1 AND isActive = 1 LIMIT 1`
  );
  return rowToKey(row);
}

export async function createApiKey(name, machineId, { visibility, isDefault, limitMode, limitValue } = {}) {
  if (!machineId) throw new Error("machineId is required");
  const db = await getAdapter();
  const { generateApiKeyWithMachine } = await import("@/shared/utils/apiKey");
  const result = generateApiKeyWithMachine(machineId);
  const vis = normalizeApiKeyVisibility(visibility);
  const wantDefault = vis === "public" && isDefault === true;
  const mode = normalizeLimitMode(limitMode);
  const value = normalizeLimitValue(mode, limitValue);
  const effectiveMode = value == null ? "none" : mode;
  const apiKey = {
    id: uuidv4(),
    name,
    key: result.key,
    machineId,
    isActive: true,
    comboAccessMode: "blacklist",
    comboAccessList: [],
    modelAccessMode: "whitelist",
    modelAccessList: [],
    visibility: vis,
    isDefault: wantDefault,
    limitMode: effectiveMode,
    limitValue: value,
    usageRequests: 0,
    usageTokens: 0,
    createdAt: new Date().toISOString(),
  };

  db.transaction(() => {
    if (wantDefault) clearAllDefaults(db);
    db.run(
      `INSERT INTO apiKeys(id, key, name, machineId, isActive, comboAccessMode, comboAccessList, modelAccessMode, modelAccessList, visibility, isDefault, limitMode, limitValue, usageRequests, usageTokens, createdAt) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        apiKey.id,
        apiKey.key,
        apiKey.name,
        apiKey.machineId,
        1,
        apiKey.comboAccessMode,
        stringifyJson(apiKey.comboAccessList),
        apiKey.modelAccessMode,
        stringifyJson(apiKey.modelAccessList),
        apiKey.visibility,
        wantDefault ? 1 : 0,
        apiKey.limitMode,
        apiKey.limitValue,
        0,
        0,
        apiKey.createdAt,
      ]
    );
  });

  return apiKey;
}

/**
 * Mark a public API key as the sole default for /connect.
 * Private keys cannot be default.
 */
export async function setApiKeyDefault(id) {
  const db = await getAdapter();
  let result = null;
  db.transaction(() => {
    const row = db.get(`SELECT * FROM apiKeys WHERE id = ?`, [id]);
    if (!row) return;
    const existing = rowToKey(row);
    if (existing.visibility !== "public") {
      throw new Error("Only public API keys can be set as default");
    }
    clearAllDefaults(db);
    db.run(`UPDATE apiKeys SET isDefault = 1 WHERE id = ?`, [id]);
    result = { ...existing, isDefault: true };
  });
  return result;
}

export async function updateApiKey(id, data) {
  const db = await getAdapter();
  let result = null;
  db.transaction(() => {
    const row = db.get(`SELECT * FROM apiKeys WHERE id = ?`, [id]);
    if (!row) return;
    const existing = rowToKey(row);
    // visibility is set only at create time — never change via update
    const {
      visibility: _ignored,
      isDefault: wantDefault,
      resetUsage,
      ...safeData
    } = data || {};
    const merged = { ...existing, ...safeData, visibility: existing.visibility };
    merged.comboAccessMode = normalizeComboAccessMode(merged.comboAccessMode);
    merged.comboAccessList = normalizeComboAccessList(merged.comboAccessList);
    merged.modelAccessMode = normalizeModelAccessMode(merged.modelAccessMode);
    merged.modelAccessList = normalizeModelAccessList(merged.modelAccessList);

    if (existing.visibility !== "public") {
      merged.isDefault = false;
    } else if (wantDefault === true) {
      clearAllDefaults(db);
      merged.isDefault = true;
    } else if (wantDefault === false) {
      merged.isDefault = false;
    } else {
      merged.isDefault = existing.isDefault;
    }

    if (data && ("limitMode" in data || "limitValue" in data)) {
      const mode = normalizeLimitMode(
        data.limitMode !== undefined ? data.limitMode : existing.limitMode
      );
      const value = normalizeLimitValue(
        mode,
        data.limitValue !== undefined ? data.limitValue : existing.limitValue
      );
      merged.limitMode = value == null ? "none" : mode;
      merged.limitValue = value;
    }

    if (resetUsage === true) {
      merged.usageRequests = 0;
      merged.usageTokens = 0;
    } else {
      merged.usageRequests = existing.usageRequests;
      merged.usageTokens = existing.usageTokens;
    }

    db.run(
      `UPDATE apiKeys SET key = ?, name = ?, machineId = ?, isActive = ?, comboAccessMode = ?, comboAccessList = ?, modelAccessMode = ?, modelAccessList = ?, isDefault = ?, limitMode = ?, limitValue = ?, usageRequests = ?, usageTokens = ? WHERE id = ?`,
      [
        merged.key,
        merged.name,
        merged.machineId,
        merged.isActive ? 1 : 0,
        merged.comboAccessMode,
        stringifyJson(merged.comboAccessList),
        merged.modelAccessMode,
        stringifyJson(merged.modelAccessList),
        merged.isDefault ? 1 : 0,
        merged.limitMode,
        merged.limitValue,
        merged.usageRequests,
        merged.usageTokens,
        id,
      ]
    );
    result = merged;
  });
  return result;
}

/** Increment lifetime counters for an API key string (used from saveRequestUsage). */
export function incrementApiKeyUsageSync(db, apiKey, tokenDelta) {
  if (!apiKey || typeof apiKey !== "string") return;
  const tokens = Math.max(0, Number(tokenDelta) || 0);
  db.run(
    `UPDATE apiKeys SET usageRequests = COALESCE(usageRequests, 0) + 1, usageTokens = COALESCE(usageTokens, 0) + ? WHERE key = ?`,
    [tokens, apiKey]
  );
}

export async function deleteApiKey(id) {
  const db = await getAdapter();
  const res = db.run(`DELETE FROM apiKeys WHERE id = ?`, [id]);
  return (res?.changes ?? 0) > 0;
}

export async function validateApiKey(key) {
  const db = await getAdapter();
  const row = db.get(`SELECT isActive FROM apiKeys WHERE key = ?`, [key]);
  if (!row) return false;
  return row.isActive === 1 || row.isActive === true;
}
