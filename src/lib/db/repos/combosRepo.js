import { v4 as uuidv4 } from "uuid";
import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";

function normalizeAccountFilters(filters) {
  if (!filters || typeof filters !== "object" || Array.isArray(filters)) return {};
  return Object.fromEntries(
    Object.entries(filters).map(([model, ids]) => [
      model,
      Array.isArray(ids)
        ? Array.from(new Set(ids.filter((id) => typeof id === "string" && id.trim()).map((id) => id.trim())))
        : [],
    ])
  );
}

function rowToCombo(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    models: parseJson(row.models, []),
    accountFilters: normalizeAccountFilters(parseJson(row.accountFilters, {})),
    useCustomAccountOrder: !!row.useCustomAccountOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getCombos() {
  const db = await getAdapter();
  const rows = db.all(`SELECT * FROM combos ORDER BY createdAt ASC`);
  return rows.map(rowToCombo);
}

export async function getComboById(id) {
  const db = await getAdapter();
  const row = db.get(`SELECT * FROM combos WHERE id = ?`, [id]);
  return rowToCombo(row);
}

export async function getComboByName(name) {
  const db = await getAdapter();
  const row = db.get(`SELECT * FROM combos WHERE name = ?`, [name]);
  return rowToCombo(row);
}

export async function createCombo(data) {
  const db = await getAdapter();
  const now = new Date().toISOString();
  const combo = {
    id: uuidv4(),
    name: data.name,
    kind: data.kind || null,
    models: data.models || [],
    accountFilters: normalizeAccountFilters(data.accountFilters),
    useCustomAccountOrder: !!data.useCustomAccountOrder,
    createdAt: now,
    updatedAt: now,
  };
  db.run(
    `INSERT INTO combos(id, name, kind, models, accountFilters, useCustomAccountOrder, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?, ?, ?, ?)`,
    [combo.id, combo.name, combo.kind, stringifyJson(combo.models), stringifyJson(combo.accountFilters), combo.useCustomAccountOrder ? 1 : 0, combo.createdAt, combo.updatedAt]
  );
  return combo;
}

export async function updateCombo(id, data) {
  const db = await getAdapter();
  let result = null;
  db.transaction(() => {
    const row = db.get(`SELECT * FROM combos WHERE id = ?`, [id]);
    if (!row) return;
    const merged = { ...rowToCombo(row), ...data, updatedAt: new Date().toISOString() };
    merged.accountFilters = normalizeAccountFilters(merged.accountFilters);
    merged.useCustomAccountOrder = !!merged.useCustomAccountOrder;
    db.run(
      `UPDATE combos SET name = ?, kind = ?, models = ?, accountFilters = ?, useCustomAccountOrder = ?, updatedAt = ? WHERE id = ?`,
      [merged.name, merged.kind, stringifyJson(merged.models || []), stringifyJson(merged.accountFilters), merged.useCustomAccountOrder ? 1 : 0, merged.updatedAt, id]
    );
    result = merged;
  });
  return result;
}

export async function deleteCombo(id) {
  const db = await getAdapter();
  let deleted = false;

  db.transaction(() => {
    const combo = db.get(`SELECT name FROM combos WHERE id = ?`, [id]);
    if (!combo) return;

    db.run(`DELETE FROM combos WHERE id = ?`, [id]);

    // Combo access rules store names, so remove this name from every key
    // while the combo deletion is still part of the same transaction.
    if (combo.name) {
      const keys = db.all(`SELECT id, comboAccessList FROM apiKeys`);
      for (const key of keys) {
        const accessList = parseJson(key.comboAccessList, []);
        if (!Array.isArray(accessList)) continue;

        const nextAccessList = Array.from(new Set(
          accessList
            .filter((item) => typeof item === "string" && item.trim())
            .map((item) => item.trim())
            .filter((item) => item !== combo.name)
        ));

        if (nextAccessList.length !== accessList.length || nextAccessList.some((item, index) => item !== accessList[index])) {
          db.run(`UPDATE apiKeys SET comboAccessList = ? WHERE id = ?`, [stringifyJson(nextAccessList), key.id]);
        }
      }
    }

    deleted = true;
  });

  return deleted;
}
