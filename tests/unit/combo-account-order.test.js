import { describe, it, expect } from "vitest";

import { sortConnectionsByOrder } from "../../src/sse/services/auth.js";

describe("sortConnectionsByOrder", () => {
  it("returns connections unchanged when no order is given", () => {
    const connections = [{ id: "a", priority: 2 }, { id: "b", priority: 1 }];
    expect(sortConnectionsByOrder(connections, null)).toBe(connections);
    expect(sortConnectionsByOrder(connections, [])).toBe(connections);
  });

  it("orders by the given ID list, overriding priority", () => {
    const connections = [
      { id: "a", priority: 1 },
      { id: "b", priority: 2 },
      { id: "c", priority: 3 },
    ];
    const sorted = sortConnectionsByOrder(connections, ["c", "a", "b"]);
    expect(sorted.map((c) => c.id)).toEqual(["c", "a", "b"]);
  });

  it("falls back to priority for connections not present in the order list", () => {
    const connections = [
      { id: "a", priority: 3 },
      { id: "b", priority: 1 },
      { id: "c", priority: 2 },
    ];
    // Only "a" is explicitly ordered; b/c should be sorted by priority after it.
    const sorted = sortConnectionsByOrder(connections, ["a"]);
    expect(sorted.map((c) => c.id)).toEqual(["a", "b", "c"]);
  });
});
