import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/localDb", () => ({
  getProviderConnectionById: vi.fn(),
  updateProviderConnection: vi.fn(),
}));
vi.mock("@/lib/network/connectionProxy", () => ({
  resolveConnectionProxyConfig: vi.fn(async () => ({})),
}));
vi.mock("@/lib/network/proxyTest", () => ({
  testProxyUrl: vi.fn(),
}));
vi.mock("open-sse/services/oauthCredentialManager.js", () => ({
  refreshProviderCredentials: vi.fn(),
  shouldRefreshCredentials: vi.fn(() => false),
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

describe("probeRegistryOpenAICompatible", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("probes dudul validateUrl with bearer token", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    const { probeRegistryOpenAICompatible } = await import(
      "../../src/app/api/providers/[id]/test/testUtils.js"
    );

    const result = await probeRegistryOpenAICompatible({
      provider: "dudul",
      apiKey: "sk-test-dudul",
    });

    expect(result.valid).toBe(true);
    expect(fetchMock).toHaveBeenCalled();
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("https://dudul.dev/v1/models");
    expect(opts.headers.Authorization).toBe("Bearer sk-test-dudul");
  });

  it("probes forge-api validateUrl with bearer token", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    const { probeRegistryOpenAICompatible } = await import(
      "../../src/app/api/providers/[id]/test/testUtils.js"
    );

    const result = await probeRegistryOpenAICompatible({
      provider: "forge-api",
      apiKey: "sk-test-forge",
    });

    expect(result.valid).toBe(true);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("https://forge-gateway-api.fly.dev/v1/models");
    expect(opts.headers.Authorization).toBe("Bearer sk-test-forge");
  });

  it("returns invalid when /models rejects the key", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401 });
    const { probeRegistryOpenAICompatible } = await import(
      "../../src/app/api/providers/[id]/test/testUtils.js"
    );

    const result = await probeRegistryOpenAICompatible({
      provider: "dudul",
      apiKey: "bad",
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid API key");
  });

  it("still reports unsupported for unknown non-openai providers", async () => {
    const { probeRegistryOpenAICompatible } = await import(
      "../../src/app/api/providers/[id]/test/testUtils.js"
    );

    const result = await probeRegistryOpenAICompatible({
      provider: "not-a-real-provider",
      apiKey: "x",
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Provider test not supported");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
