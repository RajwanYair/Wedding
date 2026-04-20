/**
 * tests/unit/a11y.test.mjs — Accessibility utilities (Sprint 51)
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  isReducedMotion,
  isHighContrast,
  isDarkMode,
  watchMotionPreference,
  watchColorScheme,
  watchContrastPreference,
  relativeLuminance,
  computeContrastRatio,
  isWcagAA,
  isWcagAALarge,
  isWcagAAA,
  wcagLevel,
  getImplicitAriaRole,
  buildAriaLabel,
  meetsMinTouchTarget,
} from "../../src/utils/a11y.js";

// ── Media query mock helpers ───────────────────────────────────────────────

function mockMatchMedia(matchesMap) {
  const listeners = new Map();
  window.matchMedia = vi.fn((query) => {
    const matches = matchesMap[query] ?? false;
    const mq = {
      matches,
      media: query,
      addEventListener: vi.fn((evt, cb) => {
        if (!listeners.has(query)) listeners.set(query, []);
        listeners.get(query).push(cb);
      }),
      removeEventListener: vi.fn((evt, cb) => {
        const list = listeners.get(query) ?? [];
        const idx = list.indexOf(cb);
        if (idx !== -1) list.splice(idx, 1);
      }),
      dispatchChange: (newMatches) => {
        const list = listeners.get(query) ?? [];
        list.forEach(cb => cb({ matches: newMatches }));
      },
    };
    mq._listeners = listeners;
    mq._query = query;
    return mq;
  });
  return { listeners };
}

afterEach(() => vi.restoreAllMocks());

// ── isReducedMotion ────────────────────────────────────────────────────────

describe("isReducedMotion()", () => {
  it("returns true when prefers-reduced-motion: reduce matches", () => {
    mockMatchMedia({ "(prefers-reduced-motion: reduce)": true });
    expect(isReducedMotion()).toBe(true);
  });

  it("returns false when media query does not match", () => {
    mockMatchMedia({ "(prefers-reduced-motion: reduce)": false });
    expect(isReducedMotion()).toBe(false);
  });
});

// ── isHighContrast ─────────────────────────────────────────────────────────

describe("isHighContrast()", () => {
  it("returns true when prefers-contrast: more matches", () => {
    mockMatchMedia({ "(prefers-contrast: more)": true });
    expect(isHighContrast()).toBe(true);
  });

  it("returns false when media query does not match", () => {
    mockMatchMedia({ "(prefers-contrast: more)": false });
    expect(isHighContrast()).toBe(false);
  });
});

// ── isDarkMode ─────────────────────────────────────────────────────────────

describe("isDarkMode()", () => {
  it("returns true when prefers-color-scheme: dark matches", () => {
    mockMatchMedia({ "(prefers-color-scheme: dark)": true });
    expect(isDarkMode()).toBe(true);
  });

  it("returns false when media query does not match", () => {
    mockMatchMedia({ "(prefers-color-scheme: dark)": false });
    expect(isDarkMode()).toBe(false);
  });
});

// ── watchMotionPreference ──────────────────────────────────────────────────

describe("watchMotionPreference()", () => {
  it("calls callback on media query change", () => {
    const cb = vi.fn();
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Re-mock to capture via watchMotionPreference
    let capturedCb;
    window.matchMedia = vi.fn((query) => ({
      matches: false,
      media: query,
      addEventListener: (_evt, handler) => { capturedCb = handler; },
      removeEventListener: vi.fn(),
    }));

    const cleanup = watchMotionPreference(cb);
    capturedCb({ matches: true });
    expect(cb).toHaveBeenCalledWith(true);
    expect(typeof cleanup).toBe("function");
  });

  it("returns no-op cleanup when window is undefined", () => {
    const origWindow = global.window;
    delete global.window;
    const cleanup = watchMotionPreference(vi.fn());
    expect(typeof cleanup).toBe("function");
    expect(() => cleanup()).not.toThrow();
    global.window = origWindow;
  });

  it("cleanup removes event listener", () => {
    const removeFn = vi.fn();
    window.matchMedia = vi.fn(() => ({
      matches: false,
      media: "",
      addEventListener: vi.fn(),
      removeEventListener: removeFn,
    }));
    const cleanup = watchMotionPreference(vi.fn());
    cleanup();
    expect(removeFn).toHaveBeenCalledOnce();
  });
});

// ── watchColorScheme ───────────────────────────────────────────────────────

describe("watchColorScheme()", () => {
  it("attaches listener and returns cleanup", () => {
    const removeFn = vi.fn();
    window.matchMedia = vi.fn(() => ({
      matches: false,
      media: "",
      addEventListener: vi.fn(),
      removeEventListener: removeFn,
    }));
    const cleanup = watchColorScheme(vi.fn());
    expect(typeof cleanup).toBe("function");
    cleanup();
    expect(removeFn).toHaveBeenCalledOnce();
  });
});

// ── watchContrastPreference ────────────────────────────────────────────────

describe("watchContrastPreference()", () => {
  it("attaches listener and returns cleanup", () => {
    const removeFn = vi.fn();
    window.matchMedia = vi.fn(() => ({
      matches: false,
      media: "",
      addEventListener: vi.fn(),
      removeEventListener: removeFn,
    }));
    const cleanup = watchContrastPreference(vi.fn());
    expect(typeof cleanup).toBe("function");
    cleanup();
    expect(removeFn).toHaveBeenCalledOnce();
  });
});

// ── relativeLuminance ──────────────────────────────────────────────────────

describe("relativeLuminance()", () => {
  it("returns 0 for black (#000000)", () => {
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
  });

  it("returns 1 for white (#ffffff)", () => {
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
  });

  it("handles short hex without #", () => {
    // #fff = white
    expect(relativeLuminance("fff")).toBeCloseTo(1, 5);
  });

  it("handles 3-digit hex with #", () => {
    // #000 = black
    expect(relativeLuminance("#000")).toBeCloseTo(0, 5);
  });

  it("returns sensible value for mid-grey #808080", () => {
    const l = relativeLuminance("#808080");
    expect(l).toBeGreaterThan(0.1);
    expect(l).toBeLessThan(0.3);
  });
});

// ── computeContrastRatio ───────────────────────────────────────────────────

describe("computeContrastRatio()", () => {
  it("black on white = 21:1", () => {
    expect(computeContrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("white on black = 21:1 (symmetric)", () => {
    expect(computeContrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 0);
  });

  it("identical colors = 1:1", () => {
    expect(computeContrastRatio("#ff0000", "#ff0000")).toBeCloseTo(1, 5);
  });

  it("ratio is always >= 1", () => {
    expect(computeContrastRatio("#aabbcc", "#112233")).toBeGreaterThanOrEqual(1);
  });
});

// ── isWcagAA ──────────────────────────────────────────────────────────────

describe("isWcagAA()", () => {
  it("black on white passes AA (4.5:1)", () => {
    expect(isWcagAA("#000000", "#ffffff")).toBe(true);
  });

  it("white on white fails AA", () => {
    expect(isWcagAA("#ffffff", "#ffffff")).toBe(false);
  });
});

// ── isWcagAALarge ──────────────────────────────────────────────────────────

describe("isWcagAALarge()", () => {
  it("black on white passes AA-large (3:1)", () => {
    expect(isWcagAALarge("#000000", "#ffffff")).toBe(true);
  });

  it("very similar colors fail AA-large", () => {
    expect(isWcagAALarge("#eeeeee", "#ffffff")).toBe(false);
  });
});

// ── isWcagAAA ──────────────────────────────────────────────────────────────

describe("isWcagAAA()", () => {
  it("black on white passes AAA (7:1)", () => {
    expect(isWcagAAA("#000000", "#ffffff")).toBe(true);
  });

  it("mid-grey on white fails AAA", () => {
    expect(isWcagAAA("#777777", "#ffffff")).toBe(false);
  });
});

// ── wcagLevel ─────────────────────────────────────────────────────────────

describe("wcagLevel()", () => {
  it("returns AAA for black on white", () => {
    expect(wcagLevel("#000000", "#ffffff")).toBe("AAA");
  });

  it("returns AA for near-AA-threshold pair", () => {
    // #595959 on white is ~7:1 border zone; use a known mid pair
    // #767676 on white is ~4.54:1, which is AA (not AAA)
    expect(wcagLevel("#767676", "#ffffff")).toBe("AA");
  });

  it("returns AA-large for a 3-4.5 ratio pair", () => {
    // Use white on dark gray that yields ratio in [3, 4.5)
    // #949494 on white is ~ 3.03:1
    expect(wcagLevel("#949494", "#ffffff")).toBe("AA-large");
  });

  it("returns fail for white on white", () => {
    expect(wcagLevel("#ffffff", "#ffffff")).toBe("fail");
  });
});

// ── getImplicitAriaRole ────────────────────────────────────────────────────

describe("getImplicitAriaRole()", () => {
  it("button -> button", () => {
    expect(getImplicitAriaRole("button")).toBe("button");
  });

  it("nav -> navigation", () => {
    expect(getImplicitAriaRole("nav")).toBe("navigation");
  });

  it("main -> main", () => {
    expect(getImplicitAriaRole("main")).toBe("main");
  });

  it("accepts uppercase tag", () => {
    expect(getImplicitAriaRole("BUTTON")).toBe("button");
  });

  it("returns null for unknown tag", () => {
    expect(getImplicitAriaRole("span")).toBeNull();
  });

  it("ul -> list", () => {
    expect(getImplicitAriaRole("ul")).toBe("list");
  });

  it("header -> banner", () => {
    expect(getImplicitAriaRole("header")).toBe("banner");
  });
});

// ── buildAriaLabel ─────────────────────────────────────────────────────────

describe("buildAriaLabel()", () => {
  it("returns base when no suffix", () => {
    expect(buildAriaLabel("Delete guest")).toBe("Delete guest");
  });

  it("appends suffix with space", () => {
    expect(buildAriaLabel("Guest", "42")).toBe("Guest 42");
  });

  it("trims whitespace from both parts", () => {
    expect(buildAriaLabel("  Send  ", " message ")).toBe("Send message");
  });
});

// ── meetsMinTouchTarget ────────────────────────────────────────────────────

describe("meetsMinTouchTarget()", () => {
  it("returns true for 44x44 (exactly meets minimum)", () => {
    expect(meetsMinTouchTarget({ width: 44, height: 44 })).toBe(true);
  });

  it("returns false for undersized element", () => {
    expect(meetsMinTouchTarget({ width: 40, height: 44 })).toBe(false);
  });

  it("accepts custom minimum", () => {
    expect(meetsMinTouchTarget({ width: 32, height: 32 }, 32)).toBe(true);
    expect(meetsMinTouchTarget({ width: 31, height: 32 }, 32)).toBe(false);
  });

  it("returns false when height is undersized", () => {
    expect(meetsMinTouchTarget({ width: 44, height: 40 })).toBe(false);
  });
});
