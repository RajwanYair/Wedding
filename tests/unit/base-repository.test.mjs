/**
 * tests/unit/base-repository.test.mjs — Sprint 159
 */

import { describe, it, expect, beforeEach } from "vitest";
import { BaseRepository } from "../../src/repositories/base-repository.js";

/** @type {Map<string, any[]>} */
let _storage;

function makeRepo(key = "items") {
  _storage = new Map([[key, []]]);
  const get = (k) => _storage.get(k) ?? [];
  const set = (k, items) => { _storage.set(k, items); };
  const upsert = (k, item) => {
    const arr = _storage.get(k) ?? [];
    const idx = arr.findIndex((x) => x.id === item.id);
    if (idx >= 0) arr[idx] = item;
    else arr.push(item);
    _storage.set(k, arr);
  };
  return new BaseRepository(key, get, set, upsert);
}

const item = (id, name = "Test") => ({ id, name });

let repo;

beforeEach(() => {
  repo = makeRepo();
});

describe("BaseRepository.findAll", () => {
  it("returns empty array initially", () => {
    expect(repo.findAll()).toEqual([]);
  });

  it("returns all stored items", () => {
    repo.upsert(item("a"));
    repo.upsert(item("b"));
    expect(repo.findAll()).toHaveLength(2);
  });
});

describe("BaseRepository.findById", () => {
  it("returns undefined for missing id", () => {
    expect(repo.findById("nonexistent")).toBeUndefined();
  });

  it("returns item with matching id", () => {
    repo.upsert(item("a", "Alice"));
    expect(repo.findById("a")?.name).toBe("Alice");
  });
});

describe("BaseRepository.upsert", () => {
  it("creates a new item", () => {
    repo.upsert(item("a"));
    expect(repo.count()).toBe(1);
  });

  it("updates an existing item", () => {
    repo.upsert(item("a", "Original"));
    repo.upsert(item("a", "Updated"));
    expect(repo.findById("a")?.name).toBe("Updated");
    expect(repo.count()).toBe(1);
  });

  it("returns the item", () => {
    const i = item("b");
    expect(repo.upsert(i)).toBe(i);
  });
});

describe("BaseRepository.create", () => {
  it("is an alias for upsert", () => {
    const i = item("c", "Charlie");
    repo.create(i);
    expect(repo.findById("c")?.name).toBe("Charlie");
  });
});

describe("BaseRepository.update", () => {
  it("returns undefined when item not found", () => {
    expect(repo.update("missing", { name: "x" })).toBeUndefined();
  });

  it("merges patch into existing item", () => {
    repo.upsert({ id: "a", name: "Alice", age: 30 });
    const updated = repo.update("a", { age: 31 });
    expect(updated?.age).toBe(31);
    expect(updated?.name).toBe("Alice");
  });

  it("preserves original id", () => {
    repo.upsert(item("a"));
    const updated = repo.update("a", { name: "New" });
    expect(updated?.id).toBe("a");
  });
});

describe("BaseRepository.delete", () => {
  it("returns false when item not found", () => {
    expect(repo.delete("missing")).toBe(false);
  });

  it("returns true when item is deleted", () => {
    repo.upsert(item("a"));
    expect(repo.delete("a")).toBe(true);
  });

  it("removes item from store", () => {
    repo.upsert(item("a"));
    repo.upsert(item("b"));
    repo.delete("a");
    expect(repo.findById("a")).toBeUndefined();
    expect(repo.count()).toBe(1);
  });
});

describe("BaseRepository.count", () => {
  it("returns 0 for empty repo", () => {
    expect(repo.count()).toBe(0);
  });

  it("returns correct count after operations", () => {
    repo.upsert(item("a"));
    repo.upsert(item("b"));
    repo.upsert(item("c"));
    repo.delete("b");
    expect(repo.count()).toBe(2);
  });
});
