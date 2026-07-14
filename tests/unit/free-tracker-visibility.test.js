import { describe, expect, it } from "vitest";
import {
  filterPublicSources,
  isSourcePublic,
  nextFreeTrackerPublicMap,
} from "../../src/lib/freeTracker/visibility.js";

describe("free tracker visibility", () => {
  it("defaults to private when map is missing", () => {
    expect(isSourcePublic({}, "inferhub")).toBe(false);
    expect(isSourcePublic({ freeTrackerPublic: {} }, "inferhub")).toBe(false);
    expect(isSourcePublic({ freeTrackerPublic: { inferhub: false } }, "inferhub")).toBe(false);
  });

  it("returns true only when explicitly enabled", () => {
    expect(isSourcePublic({ freeTrackerPublic: { inferhub: true } }, "inferhub")).toBe(true);
  });

  it("filters sources to public only", () => {
    const sources = [
      { id: "inferhub", name: "InferHub" },
      { id: "other", name: "Other" },
    ];
    const settings = { freeTrackerPublic: { inferhub: true } };
    expect(filterPublicSources(sources, settings).map((s) => s.id)).toEqual(["inferhub"]);
  });

  it("nextFreeTrackerPublicMap enables and disables cleanly", () => {
    expect(nextFreeTrackerPublicMap({}, "inferhub", true)).toEqual({ inferhub: true });
    expect(nextFreeTrackerPublicMap({ inferhub: true }, "inferhub", false)).toEqual({});
    expect(nextFreeTrackerPublicMap({ inferhub: true, x: true }, "inferhub", false)).toEqual({ x: true });
  });
});
