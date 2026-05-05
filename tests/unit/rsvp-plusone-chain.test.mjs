// tests/unit/rsvp-plusone-chain.test.mjs — S645 RSVP plus-one chain
import { describe, it, expect, beforeEach } from "vitest";
import {
  createPlusOne,
  resetIdCounter,
  generateChain,
  setAnswer,
  propagateAnswer,
  cascadeMeal,
  cascadeDietary,
  validateChain,
  reorderChain,
  removePlusOne,
  chainSummary,
} from "../../src/utils/rsvp-plusone-chain.js";

beforeEach(() => resetIdCounter());

describe("rsvp-plusone-chain", () => {
  describe("createPlusOne", () => {
    it("creates entry", () => {
      const p = createPlusOne("g1", "Sarah", 1);
      expect(p.id).toBe("po_1");
      expect(p.parentGuestId).toBe("g1");
      expect(p.name).toBe("Sarah");
      expect(p.index).toBe(1);
    });
    it("defaults name for empty", () => {
      expect(createPlusOne("g1", "", 2).name).toBe("Plus-One 2");
    });
  });

  describe("generateChain", () => {
    it("generates N entries", () => {
      const chain = generateChain("g1", 3, ["A", "B"]);
      expect(chain).toHaveLength(3);
      expect(chain[0].name).toBe("A");
      expect(chain[2].name).toBe("Plus-One 3");
      expect(chain[2].index).toBe(3);
    });
    it("returns empty for 0", () => {
      expect(generateChain("g1", 0)).toHaveLength(0);
    });
  });

  describe("setAnswer", () => {
    it("sets answer on entry", () => {
      const p = createPlusOne("g1", "X", 1);
      const updated = setAnswer(p, "q1", "yes");
      expect(updated.answers.q1).toBe("yes");
    });
  });

  describe("propagateAnswer", () => {
    it("propagates to all chain entries", () => {
      const chain = generateChain("g1", 3);
      const result = propagateAnswer(chain, "q1", "vegetarian");
      expect(result.every((e) => e.answers.q1 === "vegetarian")).toBe(true);
    });
  });

  describe("cascadeMeal / cascadeDietary", () => {
    it("cascades meal", () => {
      const result = cascadeMeal(generateChain("g1", 2), "fish");
      expect(result.every((e) => e.meal === "fish")).toBe(true);
    });
    it("cascades dietary", () => {
      const result = cascadeDietary(generateChain("g1", 2), "gluten-free");
      expect(result.every((e) => e.dietary === "gluten-free")).toBe(true);
    });
  });

  describe("validateChain", () => {
    it("valid when all answered", () => {
      const chain = generateChain("g1", 2).map((e) => setAnswer(e, "q1", "yes"));
      expect(validateChain(chain, ["q1"]).valid).toBe(true);
    });
    it("invalid when missing answers", () => {
      const chain = generateChain("g1", 2);
      const result = validateChain(chain, ["q1"]);
      expect(result.valid).toBe(false);
      expect(result.missing).toHaveLength(2);
    });
  });

  describe("reorderChain", () => {
    it("moves and re-indexes", () => {
      const chain = generateChain("g1", 3, ["A", "B", "C"]);
      const reordered = reorderChain(chain, 2, 0);
      expect(reordered[0].name).toBe("C");
      expect(reordered[0].index).toBe(1);
      expect(reordered[2].index).toBe(3);
    });
  });

  describe("removePlusOne", () => {
    it("removes and re-indexes", () => {
      const chain = generateChain("g1", 3, ["A", "B", "C"]);
      const result = removePlusOne(chain, chain[1].id);
      expect(result).toHaveLength(2);
      expect(result[1].index).toBe(2);
    });
  });

  describe("chainSummary", () => {
    it("summarizes chain", () => {
      const chain = [
        { ...createPlusOne("g1", "Alice", 1), meal: "fish", answers: { q1: "yes" } },
        createPlusOne("g1", "", 2),
      ];
      const s = chainSummary(chain);
      expect(s.total).toBe(2);
      expect(s.named).toBe(1);
      expect(s.withMeal).toBe(1);
      expect(s.fullyAnswered).toBe(1);
    });
    it("handles empty", () => {
      expect(chainSummary([]).total).toBe(0);
    });
  });
});
