import { describe, it, expect } from "vitest";
import {
  TEMPLATE_SECTIONS,
  createTemplate,
  instantiateTemplate,
  describeTemplate,
  getTemplateSections,
  mergeTemplates,
  omitSection,
} from "../../src/utils/event-template.js";

// ── Fixtures ──────────────────────────────────────────────────────────────

const SNAPSHOT = {
  weddingInfo: {
    coupleNames: "Alice & Bob",
    venue: "Tel Aviv Garden",
    guestCount: 150,
    weddingDate: "2025-09-15",
  },
  tables: [
    { id: "t1", name: "Table 1", capacity: 10, shape: "round" },
    { id: "t2", name: "Table 2", capacity: 8, shape: "rect" },
  ],
  vendors: [
    { category: "photography", name: "Studio A", price: 5000, paid: 2500 },
    { category: "flowers", name: "Bloom Co", price: 3000, paid: 0 },
  ],
  budget: [
    { category: "venue", allocated: 50000, spent: 45000 },
    { category: "photography", allocated: 15000, spent: 5000 },
  ],
  schedule: [
    { phase: "ceremony", title: "Ceremony Start", durationMin: 30 },
    { phase: "reception", title: "Dinner Service", durationMin: 90 },
  ],
  settings: { theme: "rosegold", locale: "he" },
};

const META = {
  name: "Garden Wedding Template",
  description: "Standard outdoor garden wedding",
};

// ── TEMPLATE_SECTIONS ─────────────────────────────────────────────────────

describe("TEMPLATE_SECTIONS", () => {
  it("is frozen", () => expect(Object.isFrozen(TEMPLATE_SECTIONS)).toBe(true));
  it("contains weddingInfo", () =>
    expect(TEMPLATE_SECTIONS).toContain("weddingInfo"));
  it("contains tables", () => expect(TEMPLATE_SECTIONS).toContain("tables"));
  it("contains vendors", () => expect(TEMPLATE_SECTIONS).toContain("vendors"));
});

// ── createTemplate ────────────────────────────────────────────────────────

describe("createTemplate()", () => {
  it("returns null for null snapshot", () =>
    expect(createTemplate(null, META)).toBeNull());
  it("returns null when meta.name is missing", () =>
    expect(createTemplate(SNAPSHOT, {})).toBeNull());

  it("creates template with an id", () => {
    const tpl = createTemplate(SNAPSHOT, META);
    expect(tpl.id).toMatch(/^tpl_/);
  });

  it("sets name from meta", () => {
    const tpl = createTemplate(SNAPSHOT, META);
    expect(tpl.name).toBe("Garden Wedding Template");
  });

  it("strips coupleNames from weddingInfo", () => {
    const tpl = createTemplate(SNAPSHOT, META);
    expect(tpl.sections.weddingInfo.coupleNames).toBe("");
  });

  it("preserves venue in weddingInfo", () => {
    const tpl = createTemplate(SNAPSHOT, META);
    expect(tpl.sections.weddingInfo.venue).toBe("Tel Aviv Garden");
  });

  it("strips guest assignments from tables", () => {
    const tpl = createTemplate(SNAPSHOT, META);
    expect(tpl.sections.tables).toHaveLength(2);
    expect(tpl.sections.tables[0]).not.toHaveProperty("guests");
  });

  it("zeroes vendor costs", () => {
    const tpl = createTemplate(SNAPSHOT, META);
    for (const v of tpl.sections.vendors) {
      expect(v.price).toBe(0);
      expect(v.paid).toBe(0);
    }
  });

  it("zeroes budget spent values", () => {
    const tpl = createTemplate(SNAPSHOT, META);
    for (const b of tpl.sections.budget) {
      expect(b.spent).toBe(0);
    }
  });

  it("preserves budget allocations", () => {
    const tpl = createTemplate(SNAPSHOT, META);
    expect(tpl.sections.budget[0].allocated).toBe(50000);
  });

  it("preserves settings verbatim", () => {
    const tpl = createTemplate(SNAPSHOT, META);
    expect(tpl.sections.settings.theme).toBe("rosegold");
  });

  it("includes createdAt timestamp", () => {
    const tpl = createTemplate(SNAPSHOT, META);
    expect(new Date(tpl.createdAt).getFullYear()).toBeGreaterThan(2024);
  });
});

// ── instantiateTemplate ───────────────────────────────────────────────────

describe("instantiateTemplate()", () => {
  it("returns null for null template", () =>
    expect(instantiateTemplate(null)).toBeNull());

  it("creates event from template", () => {
    const tpl = createTemplate(SNAPSHOT, META);
    const event = instantiateTemplate(tpl, {
      coupleNames: "Carlos & Diana",
      weddingDate: "2026-06-10",
    });
    expect(event).not.toBeNull();
    expect(event.weddingInfo.coupleNames).toBe("Carlos & Diana");
    expect(event.weddingInfo.weddingDate).toBe("2026-06-10");
  });

  it("generates new ids for tables", () => {
    const tpl = createTemplate(SNAPSHOT, META);
    const event = instantiateTemplate(tpl);
    expect(event.tables[0].id).not.toBe("t1");
  });

  it("initialises empty guests array", () => {
    const tpl = createTemplate(SNAPSHOT, META);
    const event = instantiateTemplate(tpl);
    expect(event.guests).toEqual([]);
  });

  it("links back to template id", () => {
    const tpl = createTemplate(SNAPSHOT, META);
    const event = instantiateTemplate(tpl);
    expect(event.templateId).toBe(tpl.id);
  });
});

// ── describeTemplate ──────────────────────────────────────────────────────

describe("describeTemplate()", () => {
  it("returns zeros for null", () => {
    const d = describeTemplate(null);
    expect(d.tableCount).toBe(0);
    expect(d.hasBudget).toBe(false);
  });

  it("reports table and vendor counts", () => {
    const tpl = createTemplate(SNAPSHOT, META);
    const d = describeTemplate(tpl);
    expect(d.tableCount).toBe(2);
    expect(d.vendorCount).toBe(2);
  });

  it("reports hasBudget and hasSchedule correctly", () => {
    const tpl = createTemplate(SNAPSHOT, META);
    const d = describeTemplate(tpl);
    expect(d.hasBudget).toBe(true);
    expect(d.hasSchedule).toBe(true);
  });
});

// ── getTemplateSections ───────────────────────────────────────────────────

describe("getTemplateSections()", () => {
  it("returns empty for null", () =>
    expect(getTemplateSections(null)).toEqual([]));
  it("returns present section keys", () => {
    const tpl = createTemplate(SNAPSHOT, META);
    const sections = getTemplateSections(tpl);
    expect(sections).toContain("tables");
    expect(sections).toContain("vendors");
    expect(sections).toContain("settings");
  });
});

// ── mergeTemplates ────────────────────────────────────────────────────────

describe("mergeTemplates()", () => {
  it("returns override when base is null", () => {
    const tpl = createTemplate(SNAPSHOT, META);
    expect(mergeTemplates(null, tpl)).toBe(tpl);
  });
  it("returns base when override is null", () => {
    const tpl = createTemplate(SNAPSHOT, META);
    expect(mergeTemplates(tpl, null)).toBe(tpl);
  });
  it("override sections win", () => {
    const base = { sections: { settings: { theme: "gold" } } };
    const over = { sections: { settings: { theme: "royal" } } };
    const merged = mergeTemplates(base, over);
    expect(merged.sections.settings.theme).toBe("royal");
  });
});

// ── omitSection ───────────────────────────────────────────────────────────

describe("omitSection()", () => {
  it("returns original for null", () =>
    expect(omitSection(null, "tables")).toBeNull());
  it("removes the specified section", () => {
    const tpl = createTemplate(SNAPSHOT, META);
    const result = omitSection(tpl, "vendors");
    expect(result.sections.vendors).toBeUndefined();
    expect(result.sections.tables).toBeDefined();
  });
  it("does not mutate original", () => {
    const tpl = createTemplate(SNAPSHOT, META);
    omitSection(tpl, "settings");
    expect(tpl.sections.settings).toBeDefined();
  });
});
