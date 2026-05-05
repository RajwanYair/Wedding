import { describe, it, expect, beforeEach } from "vitest";
import {
  resetIdCounter,
  createSuggestion,
  dismissSuggestion,
  applySuggestion,
  suggestSeating,
  suggestBudget,
  suggestVendor,
  getActiveSuggestions,
  sortSuggestions,
  getSuggestionStats,
} from "../../src/utils/ai-suggest.js";

describe("S672 ai-suggest", () => {
  beforeEach(() => resetIdCounter());

  describe("createSuggestion", () => {
    it("creates with defaults", () => {
      const s = createSuggestion({ domain: "seating", title: "Move guest A", description: "Better fit" });
      expect(s.id).toBe("sug_1");
      expect(s.confidence).toBe(0.5);
      expect(s.priority).toBe("medium");
      expect(s.dismissed).toBe(false);
      expect(s.applied).toBe(false);
    });

    it("clamps confidence to 0-1", () => {
      expect(createSuggestion({ domain: "budget", title: "X", description: "Y", confidence: 1.5 }).confidence).toBe(1);
      expect(createSuggestion({ domain: "budget", title: "X", description: "Y", confidence: -0.5 }).confidence).toBe(0);
    });
  });

  describe("dismissSuggestion / applySuggestion", () => {
    it("dismisses immutably", () => {
      const s = createSuggestion({ domain: "seating", title: "X", description: "Y" });
      const dismissed = dismissSuggestion(s);
      expect(dismissed.dismissed).toBe(true);
      expect(s.dismissed).toBe(false);
    });

    it("applies immutably", () => {
      const s = createSuggestion({ domain: "seating", title: "X", description: "Y" });
      const applied = applySuggestion(s);
      expect(applied.applied).toBe(true);
      expect(s.applied).toBe(false);
    });
  });

  describe("suggestSeating", () => {
    it("suggests splitting large groups", () => {
      const guests = Array.from({ length: 12 }, (_, i) => ({ id: `g${i}`, name: `Guest ${i}`, group: "Family" }));
      const suggestions = suggestSeating(guests, 10);
      expect(suggestions.some((s) => s.title.includes("Split"))).toBe(true);
    });

    it("suggests assigning ungrouped guests", () => {
      const guests = [
        { id: "g1", name: "A" },
        { id: "g2", name: "B", group: "Friends" },
      ];
      const suggestions = suggestSeating(guests, 10);
      expect(suggestions.some((s) => s.title.includes("ungrouped"))).toBe(true);
    });

    it("returns empty for well-organized guests", () => {
      const guests = [
        { id: "g1", name: "A", group: "Family" },
        { id: "g2", name: "B", group: "Family" },
      ];
      const suggestions = suggestSeating(guests, 10);
      expect(suggestions).toHaveLength(0);
    });
  });

  describe("suggestBudget", () => {
    it("warns when over budget", () => {
      const suggestions = suggestBudget({ totalBudget: 50000, spent: 40000, committed: 15000, guestCount: 100 });
      expect(suggestions.some((s) => s.title.includes("Over budget"))).toBe(true);
    });

    it("warns when budget nearly exhausted", () => {
      const suggestions = suggestBudget({ totalBudget: 50000, spent: 44000, committed: 2000, guestCount: 100 });
      expect(suggestions.some((s) => s.title.includes("nearly exhausted"))).toBe(true);
    });

    it("warns on high per-guest cost", () => {
      const suggestions = suggestBudget({ totalBudget: 100000, spent: 10000, committed: 5000, guestCount: 100 });
      expect(suggestions.some((s) => s.title.includes("per-guest"))).toBe(true);
    });

    it("returns empty for healthy budget", () => {
      const suggestions = suggestBudget({ totalBudget: 100000, spent: 30000, committed: 20000, guestCount: 200 });
      expect(suggestions).toHaveLength(0);
    });
  });

  describe("suggestVendor", () => {
    it("warns on overdue payments", () => {
      const vendors = [{ id: "v1", name: "DJ", paid: 1000, total: 5000, dueDate: 1000 }];
      const suggestions = suggestVendor(vendors, 5000);
      expect(suggestions.some((s) => s.title.includes("overdue"))).toBe(true);
    });

    it("suggests deposit for unpaid vendors", () => {
      const vendors = [{ id: "v1", name: "Photographer", paid: 0, total: 8000 }];
      const suggestions = suggestVendor(vendors);
      expect(suggestions.some((s) => s.title.includes("No deposit"))).toBe(true);
    });
  });

  describe("getActiveSuggestions", () => {
    it("filters out dismissed and applied", () => {
      const suggestions = [
        createSuggestion({ domain: "seating", title: "A", description: "" }),
        dismissSuggestion(createSuggestion({ domain: "seating", title: "B", description: "" })),
        applySuggestion(createSuggestion({ domain: "seating", title: "C", description: "" })),
      ];
      expect(getActiveSuggestions(suggestions)).toHaveLength(1);
    });
  });

  describe("sortSuggestions", () => {
    it("sorts by priority then confidence", () => {
      const suggestions = [
        createSuggestion({ domain: "seating", title: "Low", description: "", priority: "low", confidence: 0.9 }),
        createSuggestion({ domain: "seating", title: "High", description: "", priority: "high", confidence: 0.7 }),
        createSuggestion({ domain: "seating", title: "Med", description: "", priority: "medium", confidence: 0.8 }),
      ];
      const sorted = sortSuggestions(suggestions);
      expect(sorted[0].title).toBe("High");
      expect(sorted[1].title).toBe("Med");
      expect(sorted[2].title).toBe("Low");
    });
  });

  describe("getSuggestionStats", () => {
    it("returns correct counts", () => {
      const suggestions = [
        createSuggestion({ domain: "seating", title: "A", description: "", priority: "high" }),
        dismissSuggestion(createSuggestion({ domain: "seating", title: "B", description: "" })),
        applySuggestion(createSuggestion({ domain: "budget", title: "C", description: "" })),
        createSuggestion({ domain: "vendor", title: "D", description: "", priority: "high" }),
      ];
      const stats = getSuggestionStats(suggestions);
      expect(stats.total).toBe(4);
      expect(stats.active).toBe(2);
      expect(stats.dismissed).toBe(1);
      expect(stats.applied).toBe(1);
      expect(stats.highPriority).toBe(2);
    });
  });
});
