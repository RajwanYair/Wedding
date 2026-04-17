/**
 * tests/unit/query-builder.test.mjs — Sprint 162
 */

import { describe, it, expect } from "vitest";
import { query, Query } from "../../src/utils/query-builder.js";

const guests = [
  { id: "g1", name: "Alice", status: "confirmed", side: "groom", count: 2 },
  { id: "g2", name: "Bob", status: "pending", side: "bride", count: 1 },
  { id: "g3", name: "Carol", status: "confirmed", side: "bride", count: 3 },
  { id: "g4", name: "Dave", status: "declined", side: "groom", count: 1 },
  { id: "g5", name: "Eve", status: "confirmed", side: "groom", count: 1 },
];

describe("query factory", () => {
  it("returns a Query instance", () => {
    expect(query(guests)).toBeInstanceOf(Query);
  });

  it("handles empty array", () => {
    expect(query([]).toArray()).toEqual([]);
  });

  it("does not mutate source array", () => {
    const src = [...guests];
    query(src).where("status", "confirmed").toArray();
    expect(src).toHaveLength(guests.length);
  });
});

describe("Query.where", () => {
  it("filters by exact value", () => {
    const result = query(guests).where("status", "confirmed").toArray();
    expect(result).toHaveLength(3);
    expect(result.every((g) => g.status === "confirmed")).toBe(true);
  });

  it("returns empty when no match", () => {
    expect(query(guests).where("status", "maybe").toArray()).toHaveLength(0);
  });

  it("chains multiple where clauses (AND semantics)", () => {
    const result = query(guests)
      .where("status", "confirmed")
      .where("side", "groom")
      .toArray();
    expect(result).toHaveLength(2);
  });
});

describe("Query.whereIn", () => {
  it("filters by membership in array", () => {
    const result = query(guests).whereIn("side", ["groom", "bride"]).toArray();
    expect(result).toHaveLength(5);
  });

  it("returns subset when only some match", () => {
    const result = query(guests).whereIn("status", ["confirmed", "declined"]).toArray();
    expect(result).toHaveLength(4);
  });
});

describe("Query.whereNotIn", () => {
  it("excludes items in given set", () => {
    const result = query(guests).whereNotIn("status", ["declined"]).toArray();
    expect(result).toHaveLength(4);
  });
});

describe("Query.filter", () => {
  it("accepts custom predicate", () => {
    const result = query(guests).filter((g) => g.count > 1).toArray();
    expect(result).toHaveLength(2);
  });
});

describe("Query.orderBy", () => {
  it("sorts asc by string field", () => {
    const result = query(guests).orderBy("name", "asc").toArray();
    expect(result[0].name).toBe("Alice");
    expect(result[result.length - 1].name).toBe("Eve");
  });

  it("sorts desc by string field", () => {
    const result = query(guests).orderBy("name", "desc").toArray();
    expect(result[0].name).toBe("Eve");
  });

  it("sorts by numeric field", () => {
    const result = query(guests).orderBy("count", "desc").toArray();
    expect(result[0].count).toBe(3);
  });
});

describe("Query.limit", () => {
  it("limits result count", () => {
    expect(query(guests).limit(2).toArray()).toHaveLength(2);
  });

  it("returns all items when limit > array length", () => {
    expect(query(guests).limit(100).toArray()).toHaveLength(guests.length);
  });
});

describe("Query.offset", () => {
  it("skips first N items", () => {
    const result = query(guests).orderBy("id").offset(2).toArray();
    expect(result[0].id).toBe("g3");
  });

  it("combines with limit", () => {
    const result = query(guests).orderBy("id").offset(1).limit(2).toArray();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("g2");
  });
});

describe("Query.count", () => {
  it("returns count without toArray", () => {
    expect(query(guests).where("status", "confirmed").count()).toBe(3);
  });
});

describe("Query.first", () => {
  it("returns first matching item", () => {
    const result = query(guests).where("status", "declined").first();
    expect(result?.id).toBe("g4");
  });

  it("returns undefined when no match", () => {
    expect(query(guests).where("status", "maybe").first()).toBeUndefined();
  });
});
