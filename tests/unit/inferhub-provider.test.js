import { describe, expect, it } from "vitest";

import REGISTRY from "../../open-sse/providers/registry/index.js";
import { PROVIDERS, PROVIDER_MODELS } from "../../open-sse/providers/index.js";

describe("InferHub provider", () => {
  const inferhub = REGISTRY.find((e) => e.id === "inferhub");

  it("is registered as an OpenAI-compatible apikey provider", () => {
    expect(inferhub).toBeDefined();
    expect(inferhub.category).toBe("apikey");
    expect(inferhub.transport.baseUrl).toBe("https://api.inferhub.dev/v1/chat/completions");
    expect(inferhub.alias).toBe("inferhub");
    expect(inferhub.aliases).toContain("ih");
  });

  it("enables dynamic model discovery and passthrough", () => {
    expect(inferhub.passthroughModels).toBe(true);
    expect(inferhub.modelsFetcher).toMatchObject({
      url: "https://api.inferhub.dev/v1/models",
      type: "openai",
    });
  });

  it("builds into the runtime PROVIDERS map with the openai format default", () => {
    expect(PROVIDERS.inferhub).toBeDefined();
    expect(PROVIDERS.inferhub.format).toBe("openai");
    expect(PROVIDERS.inferhub.baseUrl).toBe("https://api.inferhub.dev/v1/chat/completions");
  });

  it("exposes seed models including short aliases", () => {
    const ids = (PROVIDER_MODELS.inferhub || []).map((m) => m.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids).toContain("glm-5.2");
    expect(ids).toContain("claude-opus-4.7");
  });

  it("keeps every registry id unique after adding inferhub", () => {
    const ids = REGISTRY.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
