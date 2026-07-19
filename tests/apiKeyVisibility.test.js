import { describe, it, expect } from "vitest";
import {
  normalizeApiKeyVisibility,
  isApiKeyPublic,
} from "../src/shared/utils/apiKeyVisibility.js";

describe("normalizeApiKeyVisibility", () => {
  it("defaults nullish/empty/unknown to private", () => {
    expect(normalizeApiKeyVisibility(undefined)).toBe("private");
    expect(normalizeApiKeyVisibility(null)).toBe("private");
    expect(normalizeApiKeyVisibility("")).toBe("private");
    expect(normalizeApiKeyVisibility("private")).toBe("private");
    expect(normalizeApiKeyVisibility("PUBLIC")).toBe("private");
    expect(normalizeApiKeyVisibility("other")).toBe("private");
  });

  it("only accepts exact public", () => {
    expect(normalizeApiKeyVisibility("public")).toBe("public");
  });
});

describe("isApiKeyPublic", () => {
  it("reads string or key object", () => {
    expect(isApiKeyPublic("public")).toBe(true);
    expect(isApiKeyPublic("private")).toBe(false);
    expect(isApiKeyPublic({ visibility: "public" })).toBe(true);
    expect(isApiKeyPublic({ visibility: null })).toBe(false);
    expect(isApiKeyPublic({})).toBe(false);
  });
});
