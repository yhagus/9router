import { describe, expect, it } from "vitest";
import {
  templateErrorMessage,
  createUpstreamErrorResult,
  createErrorResult,
} from "../../open-sse/utils/error.js";
import { DEFAULT_ERROR_MESSAGES } from "../../open-sse/config/errorConfig.js";

describe("templateErrorMessage", () => {
  it("returns the configured message for known status codes", () => {
    expect(templateErrorMessage(400)).toBe(DEFAULT_ERROR_MESSAGES[400]);
    expect(templateErrorMessage(401)).toBe(DEFAULT_ERROR_MESSAGES[401]);
    expect(templateErrorMessage(429)).toBe(DEFAULT_ERROR_MESSAGES[429]);
    expect(templateErrorMessage(502)).toBe(DEFAULT_ERROR_MESSAGES[502]);
    expect(templateErrorMessage(503)).toBe(DEFAULT_ERROR_MESSAGES[503]);
  });

  it("falls back to 502 message for unmapped 5xx codes (e.g. Cloudflare 522/529)", () => {
    expect(templateErrorMessage(522)).toBe(DEFAULT_ERROR_MESSAGES[502]);
    expect(templateErrorMessage(529)).toBe(DEFAULT_ERROR_MESSAGES[502]);
    expect(templateErrorMessage(599)).toBe(DEFAULT_ERROR_MESSAGES[502]);
  });

  it("falls back to 400 message for unmapped 4xx codes", () => {
    expect(templateErrorMessage(418)).toBe(DEFAULT_ERROR_MESSAGES[400]);
    expect(templateErrorMessage(451)).toBe(DEFAULT_ERROR_MESSAGES[400]);
  });

  it("falls back to 503 message for codes below 400", () => {
    expect(templateErrorMessage(0)).toBe(DEFAULT_ERROR_MESSAGES[503]);
  });
});

describe("createUpstreamErrorResult", () => {
  it("keeps the raw provider message in the internal error field", () => {
    const result = createUpstreamErrorResult(429, "You sent too many requests you fool", null);
    expect(result.success).toBe(false);
    expect(result.status).toBe(429);
    // Internal field stays raw for markAccountUnavailable classification
    expect(result.error).toBe("You sent too many requests you fool");
  });

  it("puts a generic templated message in the client-facing Response body", async () => {
    const result = createUpstreamErrorResult(429, "provider said: overloaded", null);
    const body = await result.response.json();
    expect(body.error.message).toBe(DEFAULT_ERROR_MESSAGES[429]);
    expect(body.error.message).not.toContain("overloaded");
  });

  it("preserves the status code in the Response", () => {
    const result = createUpstreamErrorResult(502, "fetch failed", null);
    expect(result.response.status).toBe(502);
  });

  it("attaches upstreamError property on the Response for combo classification", () => {
    const result = createUpstreamErrorResult(429, "rate limit: too many requests", 123456);
    expect(result.response.upstreamError).toEqual({
      status: 429,
      message: "rate limit: too many requests",
    });
  });

  it("preserves resetsAtMs", () => {
    const result = createUpstreamErrorResult(429, "quota exceeded", 123456789);
    expect(result.resetsAtMs).toBe(123456789);
  });

  it("does not leak raw text in the serialized JSON body", async () => {
    const secret = "your-credit-balance-is-too-low-xyz";
    const result = createUpstreamErrorResult(402, secret, null);
    const text = await result.response.text();
    expect(text).not.toContain(secret);
    expect(text).toContain(DEFAULT_ERROR_MESSAGES[402]);
  });
});

describe("createErrorResult (unchanged — gateway validation paths)", () => {
  it("still passes the raw message through to both .error and the Response body", async () => {
    const result = createErrorResult(400, "Missing required field: model", null);
    expect(result.error).toBe("Missing required field: model");
    const body = await result.response.json();
    expect(body.error.message).toBe("Missing required field: model");
  });
});
