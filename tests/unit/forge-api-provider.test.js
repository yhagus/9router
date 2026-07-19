import { describe, expect, it } from "vitest";

import REGISTRY from "../../open-sse/providers/registry/index.js";
import { PROVIDERS, PROVIDER_MODELS } from "../../open-sse/providers/index.js";

describe("Forge API provider", () => {
  const forge = REGISTRY.find((e) => e.id === "forge-api");

  it("is registered as an OpenAI-compatible apikey provider", () => {
    expect(forge).toBeDefined();
    expect(forge.category).toBe("apikey");
    expect(forge.transport.baseUrl).toBe("https://forge-gateway-api.fly.dev/v1/chat/completions");
    expect(forge.alias).toBe("forge");
    expect(forge.aliases).toContain("fa");
  });

  it("enables dynamic model discovery and passthrough", () => {
    expect(forge.passthroughModels).toBe(true);
    expect(forge.modelsFetcher).toMatchObject({
      url: "https://forge-gateway-api.fly.dev/v1/models",
      type: "openai",
    });
  });

  it("builds into the runtime PROVIDERS map with the openai format default", () => {
    expect(PROVIDERS["forge-api"]).toBeDefined();
    expect(PROVIDERS["forge-api"].format).toBe("openai");
    expect(PROVIDERS["forge-api"].baseUrl).toBe("https://forge-gateway-api.fly.dev/v1/chat/completions");
  });

  it("exposes seed models from the Forge catalogue", () => {
    const ids = (PROVIDER_MODELS.forge || []).map((m) => m.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "gpt-5.6-luna",
        "claude-sonnet-4-6",
        "deepseek-v4-flash",
        "kimi-k2.7-code",
        "MiniMax-M3",
        "glm-5.2",
      ])
    );
  });

  it("keeps every registry id unique after adding forge-api", () => {
    const ids = REGISTRY.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
