import { describe, expect, it } from "vitest";
import { flattenPoolsToSource } from "../../src/lib/freeTracker/flatten.js";

describe("flattenPoolsToSource", () => {
  const pools = [
    {
      id: "free/grok",
      name: "Grok free",
      prefix: "free/grok/",
      kind: "shared",
      usedPercent: 55,
      remainingPercent: 45,
      models: ["free/grok/grok-4.5"],
    },
    {
      id: "free/kiro",
      name: "Kiro AI free",
      prefix: "free/kiro/",
      kind: "shared",
      usedPercent: 8,
      remainingPercent: 92,
      models: ["free/kiro/glm-5", "free/kiro/claude-sonnet-4.5"],
    },
    {
      id: "free/sff",
      name: "SiliconFlow free",
      prefix: "free/sff/",
      kind: "open",
      usedPercent: null,
      remainingPercent: null,
      models: ["free/sff/tencent/Hy3"],
    },
  ];

  it("builds one InferHub source with flattened model rows", () => {
    const source = flattenPoolsToSource(pools, {
      id: "inferhub",
      name: "InferHub",
      sourceUrl: "https://inferhub.dev/pricing",
    });

    expect(source.id).toBe("inferhub");
    expect(source.name).toBe("InferHub");
    expect(source.models).toHaveLength(4);
    expect(source.note).toMatch(/community pools/i);
  });

  it("copies shared remaining percent onto each model in the pool", () => {
    const source = flattenPoolsToSource(pools);
    const kiro = source.models.filter((m) => m.poolId === "free/kiro");
    expect(kiro).toHaveLength(2);
    expect(kiro.every((m) => m.kind === "shared" && m.remainingPercent === 92)).toBe(true);
  });

  it("keeps open models without a meter", () => {
    const source = flattenPoolsToSource(pools);
    const hy3 = source.models.find((m) => m.id === "free/sff/tencent/Hy3");
    expect(hy3).toMatchObject({
      kind: "open",
      usedPercent: null,
      remainingPercent: null,
      poolName: "SiliconFlow free",
    });
  });

  it("sorts shared (low remaining first) before open", () => {
    const source = flattenPoolsToSource(pools);
    expect(source.models[0].poolId).toBe("free/grok"); // 45% left before kiro 92%
    expect(source.models.at(-1).kind).toBe("open");
  });
});
