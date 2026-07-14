import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  parseInferhubFreePools,
  parseInferhubSharedQuotas,
} from "../../src/lib/freeTracker/inferhubPricing.js";

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/inferhub-pricing-models.html",
);

describe("parseInferhubFreePools", () => {
  const html = readFileSync(fixturePath, "utf8");
  const { pools } = parseInferhubFreePools(html);

  it("extracts shared and open free pools", () => {
    expect(pools).toHaveLength(3);
    expect(pools.map((p) => p.id).sort()).toEqual([
      "free/grok",
      "free/kiro",
      "free/sff",
    ]);
  });

  it("parses used/remaining percent and models for Grok free", () => {
    const grok = pools.find((p) => p.id === "free/grok");
    expect(grok).toMatchObject({
      name: "Grok free",
      prefix: "free/grok/",
      kind: "shared",
      usedPercent: 55,
      remainingPercent: 45,
    });
    expect(grok.models).toEqual(["free/grok/grok-4.5"]);
  });

  it("parses Kiro AI free models under free/kiro/", () => {
    const kiro = pools.find((p) => p.id === "free/kiro");
    expect(kiro).toMatchObject({
      name: "Kiro AI free",
      prefix: "free/kiro/",
      kind: "shared",
      usedPercent: 8,
      remainingPercent: 92,
    });
    expect(kiro.models).toEqual([
      "free/kiro/MiniMax-M2.5",
      "free/kiro/claude-haiku-4.5",
      "free/kiro/claude-sonnet-4.5",
      "free/kiro/glm-5",
    ]);
  });

  it("includes SiliconFlow free as open (no shared meter)", () => {
    const sff = pools.find((p) => p.id === "free/sff");
    expect(sff).toMatchObject({
      name: "SiliconFlow free",
      prefix: "free/sff/",
      kind: "open",
      usedPercent: null,
      remainingPercent: null,
    });
    expect(sff.models).toEqual(["free/sff/tencent/Hy3"]);
  });

  it("keeps deprecated alias working", () => {
    const viaAlias = parseInferhubSharedQuotas(html);
    expect(viaAlias.pools).toHaveLength(3);
  });

  it("returns empty pools for empty/non-matching HTML", () => {
    expect(parseInferhubFreePools("").pools).toEqual([]);
    expect(parseInferhubFreePools("<div>no free pools</div>").pools).toEqual([]);
  });
});
