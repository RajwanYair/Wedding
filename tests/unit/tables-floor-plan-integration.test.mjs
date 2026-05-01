/**
 * S612 smoke test — floor-plan collision validator wired into tables section.
 *
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { initStore, storeSet } from "../../src/core/store.js";

vi.mock("../../src/services/sheets.js", () => ({
  enqueueWrite: vi.fn(),
  syncStoreKeyToSheets: vi.fn(() => Promise.resolve()),
}));

const SECTION = readFileSync("src/sections/tables.js", "utf8");

describe("S612 floor-plan collision validator", () => {
  beforeEach(() => {
    initStore({ floorPlan: { value: { items: [], room: { width: 100, height: 100 } } } });
  });

  it("imports helpers from utils/floor-plan.js", () => {
    expect(SECTION).toMatch(/from\s+"\.\.\/utils\/floor-plan\.js"/);
    expect(SECTION).toMatch(/validateFurniture/);
    expect(SECTION).toMatch(/findCollisions/);
  });

  it("validateFloorPlanLayout returns ok=true on empty layout", async () => {
    const { validateFloorPlanLayout } = await import("../../src/sections/tables.js");
    const r = validateFloorPlanLayout();
    expect(r.ok).toBe(true);
    expect(r.collisions).toHaveLength(0);
  });

  it("validateFloorPlanLayout flags overlapping items", async () => {
    storeSet("floorPlan", {
      items: [
        { id: "a", type: "round-table", x: 0, y: 0, w: 10, h: 10 },
        { id: "b", type: "round-table", x: 5, y: 5, w: 10, h: 10 },
      ],
      room: { width: 100, height: 100 },
    });
    const { validateFloorPlanLayout } = await import("../../src/sections/tables.js");
    const r = validateFloorPlanLayout();
    expect(r.ok).toBe(false);
    expect(r.collisions).toContainEqual(["a", "b"]);
  });

  it("saveFloorPlanItem rejects collisions", async () => {
    storeSet("floorPlan", {
      items: [{ id: "a", type: "round-table", x: 0, y: 0, w: 10, h: 10 }],
      room: { width: 100, height: 100 },
    });
    const { saveFloorPlanItem } = await import("../../src/sections/tables.js");
    const r = saveFloorPlanItem({ id: "b", type: "round-table", x: 2, y: 2, w: 10, h: 10 });
    expect(r.ok).toBe(false);
    expect(r.collidesWith).toContain("a");
  });

  it("saveFloorPlanItem rejects out-of-room items", async () => {
    const { saveFloorPlanItem } = await import("../../src/sections/tables.js");
    const r = saveFloorPlanItem({ id: "x", type: "round-table", x: 95, y: 0, w: 20, h: 10 });
    expect(r.ok).toBe(false);
    expect(r.errors?.some((e) => e.includes("room.width"))).toBe(true);
  });

  it("saveFloorPlanItem persists valid item", async () => {
    const { saveFloorPlanItem, getFloorPlan } = await import("../../src/sections/tables.js");
    const r = saveFloorPlanItem({ id: "ok", type: "round-table", x: 0, y: 0, w: 10, h: 10 });
    expect(r.ok).toBe(true);
    expect(getFloorPlan().items.find((i) => i.id === "ok")).toBeTruthy();
  });
});
