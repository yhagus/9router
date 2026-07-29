// Reconciliation check for the provider-usage queries behind /dashboard/usage
// → Providers tab. Runs against whatever usageHistory rows the local DB has; the
// invariants hold for an empty DB too, so this is safe on a fresh checkout.
import { describe, it, expect } from "vitest";
import {
  getUsageTotalsByProviders,
  getUsageStatsForProvider,
  getUsageStatsForApiKey,
} from "@/lib/db/repos/usageRepo.js";

describe("provider usage queries", () => {
  it("aggregate row count matches the per-provider breakdown", async () => {
    const totals = await getUsageTotalsByProviders({ period: "all" });
    expect(Array.isArray(totals)).toBe(true);

    for (const t of totals) {
      const stats = await getUsageStatsForProvider(t.provider, { period: "all" });
      // GROUP BY count must equal the row-scan count, incl. the NULL→"unknown" bucket.
      expect(stats.totalRequests).toBe(t.requests);
      // Every row belongs to exactly one account bucket and one API-key bucket.
      expect(stats.byAccount.reduce((n, r) => n + r.requests, 0)).toBe(t.requests);
      expect(stats.byApiKey.reduce((n, r) => n + r.requests, 0)).toBe(t.requests);
    }
  });

  it("provider stats expose byAccount/byApiKey and not byProvider", async () => {
    const stats = await getUsageStatsForProvider("does-not-exist", { period: "all" });
    expect(stats.totalRequests).toBe(0);
    expect(stats.byAccount).toEqual([]);
    expect(stats.byApiKey).toEqual([]);
    expect(stats.byProvider).toBeUndefined();
  });

  it("sorts providers by requests descending", async () => {
    const totals = await getUsageTotalsByProviders({ period: "all" });
    const requests = totals.map((t) => t.requests);
    expect(requests).toEqual([...requests].sort((a, b) => b - a));
  });

  // Regression: getUsageStatsForApiKey now shares buildUsageStats — its
  // byProvider rows must keep the `provider` field ApiKeyDetailDrawer keys on.
  it("api-key stats still return byProvider rows keyed on provider", async () => {
    const stats = await getUsageStatsForApiKey("does-not-exist", { period: "all" });
    expect(Array.isArray(stats.byProvider)).toBe(true);
    expect(stats.byAccount).toBeUndefined();
    expect(stats.highlights).toBeDefined();
  });
});
