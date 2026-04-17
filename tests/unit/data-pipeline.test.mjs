/**
 * tests/unit/data-pipeline.test.mjs — Sprint 168
 */

import { describe, it, expect, vi } from "vitest";
import { pipeline, Pipeline } from "../../src/utils/data-pipeline.js";

const guests = [
  { id: "g1", name: "Alice", status: "confirmed", side: "groom", count: 2 },
  { id: "g2", name: "Bob", status: "pending", side: "bride", count: 1 },
  { id: "g3", name: "Carol", status: "confirmed", side: "bride", count: 3 },
  { id: "g4", name: "Dave", status: "declined", side: "groom", count: 1 },
];

describe("pipeline factory", () => {
  it("returns a Pipeline instance", () => expect(pipeline(guests)).toBeInstanceOf(Pipeline));
  it("handles empty array", () => expect(pipeline([]).toArray()).toEqual([]));
  it("does not mutate source", () => {
    const src = [...guests];
    pipeline(src).filter((g) => g.status === "confirmed").toArray();
    expect(src).toHaveLength(guests.length);
  });
});

describe("map", () => {
  it("transforms items", () => {
    const result = pipeline(guests).map((g) => g.name).toArray();
    expect(result).toEqual(["Alice", "Bob", "Carol", "Dave"]);
  });
});

describe("filter", () => {
  it("keeps matching items", () => {
    const result = pipeline(guests).filter((g) => g.status === "confirmed").toArray();
    expect(result).toHaveLength(2);
  });

  it("returns empty when nothing matches", () => {
    expect(pipeline(guests).filter(() => false).toArray()).toHaveLength(0);
  });
});

describe("sortBy", () => {
  it("sorts by string field asc", () => {
    const result = pipeline(guests).sortBy("name").toArray();
    expect(result[0].name).toBe("Alice");
    expect(result[result.length - 1].name).toBe("Dave");
  });

  it("sorts by string field desc", () => {
    const result = pipeline(guests).sortBy("name", "desc").toArray();
    expect(result[0].name).toBe("Dave");
  });

  it("sorts by numeric field", () => {
    const result = pipeline(guests).sortBy("count", "desc").toArray();
    expect(result[0].count).toBe(3);
  });

  it("accepts a comparator function", () => {
    const result = pipeline(guests)
      .sortBy((a, b) => a.count - b.count)
      .toArray();
    expect(result[0].count).toBe(1);
  });
});

describe("take / skip", () => {
  it("take returns first N items", () => {
    expect(pipeline(guests).take(2).toArray()).toHaveLength(2);
  });

  it("skip removes first N items", () => {
    expect(pipeline(guests).skip(2).count()).toBe(guests.length - 2);
  });

  it("chaining take + skip works as pagination", () => {
    const page = pipeline(guests).sortBy("id").skip(1).take(2).toArray();
    expect(page).toHaveLength(2);
    expect(page[0].id).toBe("g2");
  });
});

describe("unique", () => {
  it("removes exact duplicates", () => {
    const data = [1, 2, 2, 3];
    expect(pipeline(data).unique().toArray()).toEqual([1, 2, 3]);
  });

  it("uses key extractor for objects", () => {
    const result = pipeline(guests).unique((g) => g.side).toArray();
    expect(result).toHaveLength(2); // groom + bride
  });
});

describe("reduce", () => {
  it("reduces to a value", () => {
    const total = pipeline(guests).reduce((acc, g) => acc + g.count, 0);
    expect(total).toBe(7);
  });
});

describe("groupBy", () => {
  it("groups by string field", () => {
    const groups = pipeline(guests).groupBy("status");
    expect(groups["confirmed"]).toHaveLength(2);
    expect(groups["pending"]).toHaveLength(1);
  });

  it("groups by function", () => {
    const groups = pipeline(guests).groupBy((g) => g.side);
    expect(groups["groom"]).toHaveLength(2);
    expect(groups["bride"]).toHaveLength(2);
  });
});

describe("count", () => {
  it("returns current item count", () => {
    expect(pipeline(guests).filter((g) => g.status === "confirmed").count()).toBe(2);
  });
});

describe("stats", () => {
  it("returns sum, avg, min, max", () => {
    const s = pipeline(guests).stats("count");
    expect(s.sum).toBe(7);
    expect(s.avg).toBeCloseTo(1.75);
    expect(s.min).toBe(1);
    expect(s.max).toBe(3);
    expect(s.count).toBe(4);
  });

  it("returns zeros for empty pipeline", () => {
    const s = pipeline([]).stats("count");
    expect(s).toEqual({ sum: 0, avg: 0, min: 0, max: 0, count: 0 });
  });
});

describe("mapAsync", () => {
  it("applies async transform and resolves all", async () => {
    const result = await pipeline(guests)
      .mapAsync(async (g) => g.name.toUpperCase());
    expect(result.toArray()).toContain("ALICE");
  });
});

describe("tap", () => {
  it("calls side-effect without mutating pipeline", () => {
    const seen = [];
    pipeline(guests).tap((g) => seen.push(g.id)).toArray();
    expect(seen).toHaveLength(guests.length);
    expect(pipeline(guests).tap(() => {}).count()).toBe(guests.length);
  });
});

describe("chaining", () => {
  it("can chain multiple ops", () => {
    const result = pipeline(guests)
      .filter((g) => g.status === "confirmed")
      .sortBy("name")
      .map((g) => g.name)
      .toArray();
    expect(result).toEqual(["Alice", "Carol"]);
  });
});
