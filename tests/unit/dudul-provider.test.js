import { describe, expect, it } from "vitest";

import REGISTRY from "../../open-sse/providers/registry/index.js";
import { PROVIDERS, PROVIDER_MODELS } from "../../open-sse/providers/index.js";

describe("Dudul provider", () => {
  const dudul = REGISTRY.find((e) => e.id === "dudul");

  it("is registered as an OpenAI-compatible apikey provider", () => {
    expect(dudul).toBeDefined();
    expect(dudul.category).toBe("apikey");
    expect(dudul.transport.baseUrl).toBe("https://dudul.dev/v1/chat/completions");
    expect(dudul.alias).toBe("dudul");
    expect(dudul.aliases).toContain("dd");
  });

  it("enables dynamic model discovery and passthrough", () => {
    expect(dudul.passthroughModels).toBe(true);
    expect(dudul.modelsFetcher).toMatchObject({
      url: "https://dudul.dev/v1/models",
      type: "openai",
    });
  });

  it("builds into the runtime PROVIDERS map with the openai format default", () => {
    expect(PROVIDERS.dudul).toBeDefined();
    expect(PROVIDERS.dudul.format).toBe("openai");
    expect(PROVIDERS.dudul.baseUrl).toBe("https://dudul.dev/v1/chat/completions");
  });

  it("exposes seed models from the Dudul catalogue", () => {
    const ids = (PROVIDER_MODELS.dudul || []).map((m) => m.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "deepseek-v4-flash",
        "kimi-k2.7-code",
        "kimi-k3",
        "minimax-m3",
        "qwen3.7-max",
        "qwen3.7-plus",
      ])
    );
  });

  it("keeps every registry id unique after adding dudul", () => {
    const ids = REGISTRY.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
