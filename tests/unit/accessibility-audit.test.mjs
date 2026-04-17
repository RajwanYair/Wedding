/**
 * tests/unit/accessibility-audit.test.mjs — Sprint 117
 */

import { describe, it, expect } from "vitest";
import {
  parseHexColor,
  relativeLuminance,
  contrastRatio,
  meetsContrastRequirement,
  auditFormLabels,
  auditImageAlts,
  auditAriaRoles,
  runA11yAudit,
} from "../../src/utils/accessibility-audit.js";

// ── parseHexColor ─────────────────────────────────────────────────────────

describe("parseHexColor", () => {
  it("parses #RGB shorthand", () => {
    expect(parseHexColor("#fff")).toEqual([255, 255, 255]);
  });

  it("parses #RRGGBB", () => {
    expect(parseHexColor("#ff0000")).toEqual([255, 0, 0]);
  });

  it("returns null for invalid hex", () => {
    expect(parseHexColor("#xyz")).toBeNull();
    expect(parseHexColor("red")).toBeNull();
  });
});

// ── relativeLuminance ─────────────────────────────────────────────────────

describe("relativeLuminance", () => {
  it("white has luminance 1", () => {
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 2);
  });

  it("black has luminance 0", () => {
    expect(relativeLuminance([0, 0, 0])).toBeCloseTo(0, 2);
  });
});

// ── contrastRatio ─────────────────────────────────────────────────────────

describe("contrastRatio", () => {
  it("white on black is 21:1", () => {
    const r = contrastRatio("#ffffff", "#000000");
    expect(r).toBeCloseTo(21, 0);
  });

  it("returns null for bad color", () => {
    expect(contrastRatio("red", "#000")).toBeNull();
  });

  it("same color is 1:1", () => {
    const r = contrastRatio("#808080", "#808080");
    expect(r).toBeCloseTo(1, 0);
  });
});

// ── meetsContrastRequirement ──────────────────────────────────────────────

describe("meetsContrastRequirement", () => {
  it("white/black passes AA normal", () => {
    expect(meetsContrastRequirement("#ffffff", "#000000")).toBe(true);
  });

  it("white/white fails AA normal", () => {
    expect(meetsContrastRequirement("#ffffff", "#ffffff")).toBe(false);
  });

  it("large text has lower threshold", () => {
    // ~3.54:1 between #888888 and white — passes large (≥3), fails normal (≥4.5)
    const fg = "#888888";
    expect(meetsContrastRequirement(fg, "#ffffff", "AA", "large")).toBe(true);
    expect(meetsContrastRequirement(fg, "#ffffff", "AA", "normal")).toBe(false);
  });
});

// ── auditFormLabels ───────────────────────────────────────────────────────

describe("auditFormLabels", () => {
  it("no issues when all fields have labels", () => {
    const fields = [
      { id: "name",  label: "Name" },
      { id: "email", ariaLabel: "Email address" },
    ];
    expect(auditFormLabels(fields)).toHaveLength(0);
  });

  it("reports error for missing label and aria-label", () => {
    const issues = auditFormLabels([{ id: "phone" }]);
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe("label-missing");
    expect(issues[0].severity).toBe("error");
  });

  it("context is the field id", () => {
    const issues = auditFormLabels([{ id: "meal" }]);
    expect(issues[0].context).toBe("meal");
  });
});

// ── auditImageAlts ────────────────────────────────────────────────────────

describe("auditImageAlts", () => {
  it("no issues when all images have alt text", () => {
    const images = [{ src: "a.jpg", alt: "wedding venue" }];
    expect(auditImageAlts(images)).toHaveLength(0);
  });

  it("no issues for decorative images without alt", () => {
    expect(auditImageAlts([{ src: "div.png", decorative: true }])).toHaveLength(0);
  });

  it("error for missing alt on non-decorative image", () => {
    const issues = auditImageAlts([{ src: "photo.jpg" }]);
    expect(issues[0].rule).toBe("image-alt-missing");
    expect(issues[0].severity).toBe("error");
  });

  it("warning for empty string alt", () => {
    const issues = auditImageAlts([{ src: "photo.jpg", alt: "   " }]);
    expect(issues.some((i) => i.rule === "image-alt-empty")).toBe(true);
  });
});

// ── auditAriaRoles ────────────────────────────────────────────────────────

describe("auditAriaRoles", () => {
  it("no issues for valid roles", () => {
    const els = [{ role: "button", id: "r1" }, { role: "dialog", id: "r2" }];
    expect(auditAriaRoles(els)).toHaveLength(0);
  });

  it("error for unknown role", () => {
    const issues = auditAriaRoles([{ role: "foobar", id: "x" }]);
    expect(issues[0].rule).toBe("aria-role-invalid");
    expect(issues[0].severity).toBe("error");
  });
});

// ── runA11yAudit ──────────────────────────────────────────────────────────

describe("runA11yAudit", () => {
  it("aggregates issues from all sub-audits", () => {
    const issues = runA11yAudit({
      fields: [{ id: "city" }],        // 1 label-missing
      images: [{ src: "img.jpg" }],    // 1 image-alt-missing
      roles:  [{ role: "banana" }],    // 1 aria-role-invalid
    });
    expect(issues).toHaveLength(3);
  });

  it("empty input produces no issues", () => {
    expect(runA11yAudit()).toHaveLength(0);
  });
});
