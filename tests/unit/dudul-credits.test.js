import { describe, expect, it } from "vitest";
import {
  parseDudulCredits,
  DUDUL_FREE_MODELS,
} from "../../src/lib/freeTracker/dudulCredits.js";
import { flattenPoolsToSource } from "../../src/lib/freeTracker/flatten.js";

describe("parseDudulCredits", () => {
  const sample = {
    object: "list",
    keys: [
      {
        created_at: "2026-07-18T06:00:59.750662Z",
        expires_at: null,
        key_prefix: "sk-dudul-7ujuh",
        label: "Dudul V7",
        last_used_at: "2026-07-18T12:02:20.609700Z",
        quota_credits: 500000000,
        remaining_credits: 0,
        status: "active",
        used_credits: 500540923,
      },
    ],
  };

  it("maps exhausted pool to 0% remaining / 100% used", () => {
    const { pools } = parseDudulCredits(sample);
    expect(pools).toHaveLength(1);
    expect(pools[0]).toMatchObject({
      id: "dudul",
      kind: "shared",
      remainingPercent: 0,
      usedPercent: 100,
    });
    expect(pools[0].models).toEqual(DUDUL_FREE_MODELS);
  });

  it("sums remaining/quota across active keys", () => {
    const { pools } = parseDudulCredits({
      keys: [
        { status: "active", quota_credits: 100, remaining_credits: 25 },
        { status: "active", quota_credits: 100, remaining_credits: 75 },
        { status: "revoked", quota_credits: 1000, remaining_credits: 1000 },
      ],
    });
    expect(pools[0].remainingPercent).toBe(50);
    expect(pools[0].usedPercent).toBe(50);
  });

  it("returns empty pools when no usable keys", () => {
    expect(parseDudulCredits({ keys: [] }).pools).toEqual([]);
    expect(parseDudulCredits({}).pools).toEqual([]);
    expect(parseDudulCredits(null).pools).toEqual([]);
  });

  it("flattens into a Free Tracker source card shape", () => {
    const { pools } = parseDudulCredits(sample);
    const source = flattenPoolsToSource(pools, {
      id: "dudul",
      name: "Dudul",
      icon: "/providers/dudul.png",
      sourceUrl: "https://dudul.dev/",
      note: "Shared credits across Dudul free keys (public pool).",
    });
    expect(source.id).toBe("dudul");
    expect(source.models.length).toBe(DUDUL_FREE_MODELS.length);
    expect(source.models.every((m) => m.kind === "shared" && m.remainingPercent === 0)).toBe(true);
  });
});
