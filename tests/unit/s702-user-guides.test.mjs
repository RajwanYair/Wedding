/**
 * tests/unit/s702-user-guides.test.mjs
 * S702 — User guides (Diátaxis): couple-guide.md + planner-guide.md
 *         structural validation, required sections, cross-links.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

describe("S702 couple-guide.md", () => {
  const path = resolve(ROOT, "docs/users/couple-guide.md");

  it("file exists", () => {
    expect(existsSync(path)).toBe(true);
  });

  it("has Diátaxis type declaration", () => {
    const doc = readFileSync(path, "utf8");
    expect(doc.toLowerCase()).toContain("diátaxis");
  });

  it("has quick-start checklist", () => {
    const doc = readFileSync(path, "utf8");
    expect(doc.toLowerCase()).toContain("checklist");
  });

  it("covers sign in section", () => {
    const doc = readFileSync(path, "utf8");
    expect(doc.toLowerCase()).toContain("sign in");
  });

  it("covers WhatsApp + RSVP", () => {
    const doc = readFileSync(path, "utf8");
    expect(doc.toLowerCase()).toContain("whatsapp");
    expect(doc.toLowerCase()).toContain("rsvp");
  });

  it("covers vendor & budget section", () => {
    const doc = readFileSync(path, "utf8");
    expect(doc.toLowerCase()).toContain("vendor");
    expect(doc.toLowerCase()).toContain("budget");
  });

  it("covers gift registry section", () => {
    const doc = readFileSync(path, "utf8");
    expect(doc.toLowerCase()).toContain("registry");
  });

  it("covers floor plan or tables section", () => {
    const doc = readFileSync(path, "utf8");
    expect(doc.toLowerCase()).toMatch(/table|floor.?plan/);
  });

  it("covers AI suggestions", () => {
    const doc = readFileSync(path, "utf8");
    expect(doc.toLowerCase()).toContain("ai");
  });

  it("links to planner-guide.md", () => {
    const doc = readFileSync(path, "utf8");
    expect(doc).toContain("planner-guide.md");
  });

  it("has at least 8 numbered headings", () => {
    const doc = readFileSync(path, "utf8");
    const headings = doc.match(/^## \d+\./gm);
    expect((headings?.length ?? 0)).toBeGreaterThanOrEqual(8);
  });
});

describe("S702 planner-guide.md", () => {
  const path = resolve(ROOT, "docs/users/planner-guide.md");

  it("file exists", () => {
    expect(existsSync(path)).toBe(true);
  });

  it("has Diátaxis type declaration", () => {
    const doc = readFileSync(path, "utf8");
    expect(doc.toLowerCase()).toContain("diátaxis");
  });

  it("is no longer a stub", () => {
    const doc = readFileSync(path, "utf8");
    expect(doc).not.toContain("stub");
  });

  it("covers multi-event management", () => {
    const doc = readFileSync(path, "utf8");
    expect(doc.toLowerCase()).toContain("multi-event");
  });

  it("covers budget tracking", () => {
    const doc = readFileSync(path, "utf8");
    expect(doc.toLowerCase()).toContain("budget");
  });

  it("covers analytics and reporting", () => {
    const doc = readFileSync(path, "utf8");
    expect(doc.toLowerCase()).toMatch(/analytics|reporting/);
  });

  it("covers vendor payment schedule", () => {
    const doc = readFileSync(path, "utf8");
    expect(doc.toLowerCase()).toContain("payment schedule");
  });

  it("covers Stripe Connect", () => {
    const doc = readFileSync(path, "utf8");
    expect(doc).toContain("Stripe");
  });

  it("covers AI features section", () => {
    const doc = readFileSync(path, "utf8");
    expect(doc.toLowerCase()).toContain("ai");
  });

  it("has a planner checklist table", () => {
    const doc = readFileSync(path, "utf8");
    expect(doc.toLowerCase()).toContain("checklist");
  });

  it("links to couple-guide.md", () => {
    const doc = readFileSync(path, "utf8");
    expect(doc).toContain("couple-guide.md");
  });

  it("has at least 6 numbered headings", () => {
    const doc = readFileSync(path, "utf8");
    const headings = doc.match(/^## \d+\./gm);
    expect((headings?.length ?? 0)).toBeGreaterThanOrEqual(6);
  });
});
