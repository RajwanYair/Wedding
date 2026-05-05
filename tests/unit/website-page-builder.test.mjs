import { describe, it, expect, beforeEach } from "vitest";
import {
  createPage,
  addBlock,
  removeBlock,
  moveBlock,
  toggleBlockVisibility,
  setPublished,
  duplicatePage,
  defaultWeddingPage,
  resetCounters,
  BLOCK_TYPES,
} from "../../src/utils/website-page-builder.js";

describe("website-page-builder", () => {
  beforeEach(() => resetCounters());

  describe("BLOCK_TYPES", () => {
    it("contains expected types", () => {
      expect(BLOCK_TYPES).toContain("hero");
      expect(BLOCK_TYPES).toContain("rsvp");
      expect(BLOCK_TYPES).toContain("gallery");
      expect(BLOCK_TYPES.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe("createPage", () => {
    it("creates a page with sequential ID", () => {
      const p = createPage("Our Wedding");
      expect(p.id).toBe("page_1");
      expect(p.title).toBe("Our Wedding");
      expect(p.slug).toBe("our-wedding");
      expect(p.blocks).toEqual([]);
      expect(p.published).toBe(false);
    });

    it("uses custom slug", () => {
      const p = createPage("Hello", "custom-slug");
      expect(p.slug).toBe("custom-slug");
    });
  });

  describe("addBlock", () => {
    it("adds a block to a page", () => {
      const page = createPage("Test");
      const block = addBlock(page, "hero", { heading: "Hi" });
      expect(block.type).toBe("hero");
      expect(page.blocks.length).toBe(1);
    });

    it("rejects unknown block type", () => {
      const page = createPage("Test");
      expect(addBlock(page, "unicorn")).toBeNull();
    });

    it("rejects null page", () => {
      expect(addBlock(null, "hero")).toBeNull();
    });
  });

  describe("removeBlock", () => {
    it("removes a block and reorders", () => {
      const page = createPage("Test");
      const b1 = addBlock(page, "hero");
      const b2 = addBlock(page, "gallery");
      removeBlock(page, b1.id);
      expect(page.blocks.length).toBe(1);
      expect(page.blocks[0].order).toBe(0);
    });

    it("returns false for unknown block", () => {
      const page = createPage("Test");
      expect(removeBlock(page, "nope")).toBe(false);
    });
  });

  describe("moveBlock", () => {
    it("moves a block to new position", () => {
      const page = createPage("Test");
      const b1 = addBlock(page, "hero");
      addBlock(page, "gallery");
      addBlock(page, "footer");
      moveBlock(page, b1.id, 2);
      expect(page.blocks[2].id).toBe(b1.id);
      expect(page.blocks[0].order).toBe(0);
      expect(page.blocks[2].order).toBe(2);
    });

    it("rejects invalid index", () => {
      const page = createPage("Test");
      addBlock(page, "hero");
      expect(moveBlock(page, page.blocks[0].id, 5)).toBe(false);
    });
  });

  describe("toggleBlockVisibility", () => {
    it("toggles visibility", () => {
      const page = createPage("Test");
      const block = addBlock(page, "hero");
      expect(block.visible).toBe(true);
      toggleBlockVisibility(page, block.id);
      expect(block.visible).toBe(false);
    });
  });

  describe("setPublished", () => {
    it("publishes a page", () => {
      const page = createPage("Test");
      setPublished(page, true);
      expect(page.published).toBe(true);
    });

    it("returns false for null", () => {
      expect(setPublished(null)).toBe(false);
    });
  });

  describe("duplicatePage", () => {
    it("creates a copy with new IDs", () => {
      const page = createPage("Original");
      addBlock(page, "hero");
      addBlock(page, "gallery");
      const copy = duplicatePage(page);
      expect(copy.id).not.toBe(page.id);
      expect(copy.title).toContain("(copy)");
      expect(copy.blocks.length).toBe(2);
      expect(copy.blocks[0].id).not.toBe(page.blocks[0].id);
    });

    it("returns null for null", () => {
      expect(duplicatePage(null)).toBeNull();
    });
  });

  describe("defaultWeddingPage", () => {
    it("generates a full wedding page with standard blocks", () => {
      const page = defaultWeddingPage("Yair & Dana");
      expect(page.title).toBe("Yair & Dana");
      expect(page.blocks.length).toBe(10);
      expect(page.blocks[0].type).toBe("hero");
      expect(page.blocks[page.blocks.length - 1].type).toBe("footer");
    });

    it("uses default name", () => {
      const page = defaultWeddingPage();
      expect(page.title).toBe("Our Wedding");
    });
  });
});
