import { v4 as uuidv4 } from "uuid";
import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";
import { normalizeApiKeyVisibility, isApiKeyPublic } from "@/shared/utils/apiKeyVisibility";

export { normalizeApiKeyVisibility, isApiKeyPublic };

const COMBO_ACCESS_MODES = new Set(["blacklist", "whitelist"]);

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

function rowToKey(row) {
  if (!row) return null;
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
    visibility: normalizeApiKeyVisibility(row.visibility),
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

export async function createApiKey(name, machineId, { visibility } = {}) {
  if (!machineId) throw new Error("machineId is required");
  const db = await getAdapter();
  const { generateApiKeyWithMachine } = await import("@/shared/utils/apiKey");
  const result = generateApiKeyWithMachine(machineId);
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
    visibility: normalizeApiKeyVisibility(visibility),
    createdAt: new Date().toISOString(),
  };
  db.run(
    `INSERT INTO apiKeys(id, key, name, machineId, isActive, comboAccessMode, comboAccessList, modelAccessMode, modelAccessList, visibility, createdAt) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [apiKey.id, apiKey.key, apiKey.name, apiKey.machineId, 1, apiKey.comboAccessMode, stringifyJson(apiKey.comboAccessList), apiKey.modelAccessMode, stringifyJson(apiKey.modelAccessList), apiKey.visibility, apiKey.createdAt]
  );
  return apiKey;
}

export async function updateApiKey(id, data) {
  const db = await getAdapter();
  let result = null;
  db.transaction(() => {
    const row = db.get(`SELECT * FROM apiKeys WHERE id = ?`, [id]);
    if (!row) return;
    const existing = rowToKey(row);
    // visibility is set only at create time — never change via update
    const { visibility: _ignored, ...safeData } = data || {};
    const merged = { ...existing, ...safeData, visibility: existing.visibility };
    merged.comboAccessMode = normalizeComboAccessMode(merged.comboAccessMode);
    merged.comboAccessList = normalizeComboAccessList(merged.comboAccessList);
    merged.modelAccessMode = normalizeModelAccessMode(merged.modelAccessMode);
    merged.modelAccessList = normalizeModelAccessList(merged.modelAccessList);
    db.run(
      `UPDATE apiKeys SET key = ?, name = ?, machineId = ?, isActive = ?, comboAccessMode = ?, comboAccessList = ?, modelAccessMode = ?, modelAccessList = ? WHERE id = ?`,
      [merged.key, merged.name, merged.machineId, merged.isActive ? 1 : 0, merged.comboAccessMode, stringifyJson(merged.comboAccessList), merged.modelAccessMode, stringifyJson(merged.modelAccessList), id]
    );
    result = merged;
  });
  return result;
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
