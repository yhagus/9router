// End-to-end: a cache-bearing request flows through canonicalizeUsage →
// saveRequestUsage → getUsageStats, proving cached tokens are persisted,
// aggregated, and cost is computed correctly (the bug this branch fixes).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { canonicalizeUsage } from "../../open-sse/utils/usageTracking.js";
import { stringifyJson } from "@/lib/db/helpers/jsonCol.js";

const originalDataDir = process.env.DATA_DIR;
let tempDir;
let db;
let driver;

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "9router-cached-e2e-"));
  process.env.DATA_DIR = tempDir;
  vi.resetModules();
  db = await import("@/lib/db/index.js");
  driver = await import("@/lib/db/driver.js");
  await db.initDb();
});

afterAll(() => {
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
});

describe("cached-token end-to-end (persist + aggregate + cost)", () => {
  it("Claude cache usage: canonical prompt is inclusive, cached persisted, cost correct", async () => {
    // Raw Claude usage (cache-EXCLUSIVE prompt): input 100, cache_read 200, cache_creation 30, output 50
    const canonical = canonicalizeUsage({
      prompt_tokens: 100,
      completion_tokens: 50,
      cache_read_input_tokens: 200,
      cache_creation_input_tokens: 30,
    });
    expect(canonical.prompt_tokens).toBe(330); // inclusive

    await db.saveRequestUsage({
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      connectionId: "c-cache",
      tokens: canonical,
      endpoint: "/v1/messages",
      status: "ok",
    });

    const stats = await db.getUsageStats("24h");
    expect(stats.totalCachedTokens).toBe(200);
    expect(stats.totalPromptTokens).toBe(330);
    expect(stats.byProvider.anthropic.cachedTokens).toBe(200);

    // Cost: nonCached=330-200-30=100 @3 + cached 200 @0.30 + creation 30 @3.75 + output 50 @15
    const expected = (100 * 3 + 200 * 0.3 + 30 * 3.75 + 50 * 15) / 1_000_000;
    const hist = await db.getUsageHistory({ provider: "anthropic" });
    expect(hist.length).toBe(1);
    expect(hist[0].cost).toBeCloseTo(expected, 12);
    expect(hist[0].tokens.cached_tokens).toBe(200);
    expect(hist[0].tokens.cache_creation_input_tokens).toBe(30);
  });

  it("OpenAI cache usage: inclusive prompt passes through, cached counted once", async () => {
    const canonical = canonicalizeUsage({
      prompt_tokens: 1000,        // already includes cached
      completion_tokens: 200,
      cached_tokens: 600,
    });
    expect(canonical.prompt_tokens).toBe(1000);
    expect(canonical.cached_tokens).toBe(600);

    await db.saveRequestUsage({
      provider: "openai",
      model: "gpt-4o",
      connectionId: "c-oai",
      tokens: canonical,
      endpoint: "/v1/chat/completions",
      status: "ok",
    });

    const hist = await db.getUsageHistory({ provider: "openai" });
    expect(hist[0].tokens.prompt_tokens).toBe(1000);
    expect(hist[0].tokens.cached_tokens).toBe(600);
  });

  it("repairs stale daily summaries from history before all-time stats", async () => {
    const adapter = driver.getAdapterSync();
    const timestamp = new Date().toISOString();
    const tokens = {
      prompt_tokens: 10,
      completion_tokens: 5,
      cache_read_input_tokens: 7,
      cache_creation_input_tokens: 3,
    };

    adapter.transaction(() => {
      adapter.run(`DELETE FROM usageHistory`);
      adapter.run(`DELETE FROM usageDaily`);
      adapter.run(`DELETE FROM _meta WHERE key IN ('usageDailySummaryVersion', 'usageDailyHistoryCount', 'usageDailyHistoryMaxId')`);
      adapter.run(
        `INSERT INTO usageHistory(timestamp, provider, model, connectionId, apiKey, endpoint, promptTokens, completionTokens, cost, status, tokens, meta) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          timestamp,
          "anthropic",
          "claude-cache-test",
          "c-stale",
          "sk-test",
          "/v1/messages",
          10,
          5,
          0,
          "ok",
          stringifyJson(tokens),
          stringifyJson({}),
        ]
      );
      const day = timestamp.slice(0, 10);
      adapter.run(
        `INSERT INTO usageDaily(dateKey, data) VALUES(?, ?)`,
        [day, stringifyJson({ requests: 1, promptTokens: 1, completionTokens: 1, cachedTokens: 0, cost: 0, byProvider: {} })]
      );
    });

    const live = await db.getUsageStats("24h");
    const all = await db.getUsageStats("all");

    expect(live.totalRequests).toBe(1);
    expect(live.totalPromptTokens).toBe(20);
    expect(live.totalCompletionTokens).toBe(5);
    expect(live.totalCachedTokens).toBe(7);
    expect(all.totalRequests).toBe(live.totalRequests);
    expect(all.totalPromptTokens).toBe(live.totalPromptTokens);
    expect(all.totalCompletionTokens).toBe(live.totalCompletionTokens);
    expect(all.totalCachedTokens).toBe(live.totalCachedTokens);
    expect(all.byProvider.anthropic.cachedTokens).toBe(7);
  });
});
