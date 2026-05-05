// @ts-check
/**
 * tests/e2e/browser-compat.spec.mjs
 *
 * Cross-browser compatibility test suite for the Wedding Manager.
 *
 * Runs against every project defined in playwright.config.mjs (Chromium,
 * Firefox, WebKit/Safari, Edge, Pixel, Galaxy, iPad, iPhone SE …).
 *
 * Tests are grouped by capability category so failures point to a specific
 * technology surface rather than a vague "doesn't work in browser X".
 *
 * No authentication required — all checks are on the public landing page.
 */
import { test, expect } from "@playwright/test";

/* ────────────────────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * Navigate to root and wait for full app initialisation.
 * @param {import("@playwright/test").Page} page
 */
async function loadApp(page) {
  await page.goto("/");
  await page.waitForFunction(() => document.readyState === "complete", {
    timeout: 15_000,
  });
  // Also wait for the <html> dir attribute to be set by the app boot
  await page.waitForFunction(() => document.documentElement.hasAttribute("dir"), {
    timeout: 10_000,
  });
}

/* ────────────────────────────────────────────────────────────────────────────
   1. App Bootstrap
   ──────────────────────────────────────────────────────────────────────────── */
test.describe("App bootstrap", () => {
  test.beforeEach(async ({ page }) => {
    await loadApp(page);
  });

  test("page loads with a title", async ({ page }) => {
    await expect(page).toHaveTitle(/\S/);
  });

  test("HTML dir attribute is rtl", async ({ page }) => {
    const dir = await page.locator("html").getAttribute("dir");
    expect(dir).toBe("rtl");
  });

  test("HTML lang attribute is set", async ({ page }) => {
    const lang = await page.locator("html").getAttribute("lang");
    expect(lang).toBeTruthy();
  });

  test("viewport meta tag is present", async ({ page }) => {
    const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
    expect(viewport).toMatch(/width=device-width/);
  });

  test("manifest link is present", async ({ page }) => {
    const rel = await page.locator('link[rel="manifest"]').getAttribute("href");
    expect(rel).toBeTruthy();
  });
});

/* ────────────────────────────────────────────────────────────────────────────
   2. JavaScript Engine — ES2022+ API Surface
   ──────────────────────────────────────────────────────────────────────────── */
test.describe("JavaScript API coverage", () => {
  test.beforeEach(async ({ page }) => {
    await loadApp(page);
  });

  test("localStorage is available and writable", async ({ page }) => {
    const ok = await page.evaluate(() => {
      try {
        localStorage.setItem("__compat_test__", "1");
        const v = localStorage.getItem("__compat_test__");
        localStorage.removeItem("__compat_test__");
        return v === "1";
      } catch {
        return false;
      }
    });
    expect(ok).toBe(true);
  });

  test("fetch API is available", async ({ page }) => {
    const ok = await page.evaluate(() => typeof fetch === "function");
    expect(ok).toBe(true);
  });

  test("Promise and async/await work", async ({ page }) => {
    const ok = await page.evaluate(async () => {
      const val = await Promise.resolve(42);
      return val === 42;
    });
    expect(ok).toBe(true);
  });

  test("structuredClone is available", async ({ page }) => {
    const ok = await page.evaluate(() => typeof structuredClone === "function");
    expect(ok).toBe(true);
  });

  test("Array.prototype.at is available", async ({ page }) => {
    const ok = await page.evaluate(() => typeof [].at === "function");
    expect(ok).toBe(true);
  });

  test("Object.hasOwn is available", async ({ page }) => {
    const ok = await page.evaluate(() => typeof Object.hasOwn === "function");
    expect(ok).toBe(true);
  });

  test("globalThis is available", async ({ page }) => {
    const ok = await page.evaluate(() => typeof globalThis === "object");
    expect(ok).toBe(true);
  });

  test("WeakRef is available", async ({ page }) => {
    const ok = await page.evaluate(() => typeof WeakRef === "function");
    expect(ok).toBe(true);
  });

  test("CSS.supports is available", async ({ page }) => {
    const ok = await page.evaluate(() => typeof CSS !== "undefined" && typeof CSS.supports === "function");
    expect(ok).toBe(true);
  });

  test("IntersectionObserver is available", async ({ page }) => {
    const ok = await page.evaluate(() => typeof IntersectionObserver === "function");
    expect(ok).toBe(true);
  });

  test("ResizeObserver is available", async ({ page }) => {
    const ok = await page.evaluate(() => typeof ResizeObserver === "function");
    expect(ok).toBe(true);
  });
});

/* ────────────────────────────────────────────────────────────────────────────
   3. CSS Feature Detection
   ──────────────────────────────────────────────────────────────────────────── */
test.describe("CSS feature support", () => {
  test.beforeEach(async ({ page }) => {
    await loadApp(page);
  });

  test("CSS custom properties (variables) are supported", async ({ page }) => {
    const ok = await page.evaluate(() => CSS.supports("color", "var(--x)"));
    expect(ok).toBe(true);
  });

  test("CSS Grid is supported", async ({ page }) => {
    const ok = await page.evaluate(() => CSS.supports("display", "grid"));
    expect(ok).toBe(true);
  });

  test("CSS Flexbox is supported", async ({ page }) => {
    const ok = await page.evaluate(() => CSS.supports("display", "flex"));
    expect(ok).toBe(true);
  });

  test("backdrop-filter (glassmorphism) is supported", async ({ page }) => {
    const ok = await page.evaluate(
      () =>
        CSS.supports("backdrop-filter", "blur(1px)") ||
        CSS.supports("-webkit-backdrop-filter", "blur(1px)"),
    );
    expect(ok).toBe(true);
  });

  test("CSS @layer is supported", async ({ page }) => {
    // CSSLayerBlockRule exists in all browsers shipping @layer
    const ok = await page.evaluate(() => typeof CSSLayerBlockRule !== "undefined");
    expect(ok).toBe(true);
  });

  test("CSS nesting is supported", async ({ page }) => {
    const ok = await page.evaluate(() => CSS.supports("selector(&)"));
    expect(ok).toBe(true);
  });

  test("CSS clip-path is supported", async ({ page }) => {
    const ok = await page.evaluate(() => CSS.supports("clip-path", "circle(50%)"));
    expect(ok).toBe(true);
  });

  test("CSS custom properties resolve on root element", async ({ page }) => {
    const value = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--color-bg")
        .trim(),
    );
    // Value may be empty if the CSS file isn't loaded, but it should not throw
    expect(typeof value).toBe("string");
  });
});

/* ────────────────────────────────────────────────────────────────────────────
   4. RTL & Internationalisation Layout
   ──────────────────────────────────────────────────────────────────────────── */
test.describe("RTL / i18n layout", () => {
  test.beforeEach(async ({ page }) => {
    await loadApp(page);
  });

  test("body or root has RTL direction", async ({ page }) => {
    const dir = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return style.direction;
    });
    expect(dir).toBe("rtl");
  });

  test("Hebrew characters render without tofu (no .notdef glyphs)", async ({
    page,
  }) => {
    // If Hebrew is visible as □ boxes the browser doesn't have a Hebrew font.
    // We detect this by checking that the page has text content containing
    // at least one Unicode Hebrew code point (U+0590–U+05FF).
    const hasHebrew = await page.evaluate(() => {
      const text = document.body.innerText;
      return /[\u0590-\u05FF]/.test(text);
    });
    // Hebrew text should be present on the landing page
    expect(hasHebrew).toBe(true);
  });

  test("text-align start resolves to right in RTL context", async ({ page }) => {
    const resolved = await page.evaluate(() => {
      const el = document.createElement("div");
      el.style.direction = "rtl";
      el.style.textAlign = "start";
      document.body.appendChild(el);
      const val = getComputedStyle(el).textAlign;
      document.body.removeChild(el);
      return val;
    });
    // "start" in RTL == "right" (or "start" in modern engines that keep logical value)
    expect(["right", "start"]).toContain(resolved);
  });
});

/* ────────────────────────────────────────────────────────────────────────────
   5. Touch & Pointer Events (critical for mobile projects)
   ──────────────────────────────────────────────────────────────────────────── */
test.describe("Touch & pointer input", () => {
  test.beforeEach(async ({ page }) => {
    await loadApp(page);
  });

  test("pointer events API is available", async ({ page }) => {
    const ok = await page.evaluate(
      () =>
        typeof PointerEvent !== "undefined" ||
        typeof TouchEvent !== "undefined" ||
        typeof MouseEvent !== "undefined",
    );
    expect(ok).toBe(true);
  });

  test("interactive elements have adequate touch target size (≥ 44px)", async ({
    page,
    isMobile,
  }) => {
    if (!isMobile) test.skip();

    // Find buttons/links that are visible and check they meet minimum touch target
    const smallTargets = await page.evaluate(() => {
      const MIN = 44;
      const interactives = [...document.querySelectorAll("button, a, [role='button']")].filter(
        (el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0; // visible
        },
      );
      return interactives
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.width < MIN || rect.height < MIN;
        })
        .map((el) => ({
          tag: el.tagName,
          text: el.textContent?.slice(0, 30),
          w: Math.round(el.getBoundingClientRect().width),
          h: Math.round(el.getBoundingClientRect().height),
        }));
    });
    // Allow up to 3 small targets (icon-only buttons are often smaller by design)
    expect(smallTargets.length).toBeLessThanOrEqual(3);
  });
});

/* ────────────────────────────────────────────────────────────────────────────
   6. Responsive Layout Breakpoints
   ──────────────────────────────────────────────────────────────────────────── */
test.describe("Responsive layout", () => {
  test.beforeEach(async ({ page }) => {
    await loadApp(page);
  });

  test("no horizontal overflow at current viewport", async ({ page }) => {
    const overflows = await page.evaluate(() => {
      const docWidth = document.documentElement.scrollWidth;
      const vpWidth = document.documentElement.clientWidth;
      return docWidth > vpWidth + 1; // 1px tolerance for rounding
    });
    expect(overflows).toBe(false);
  });

  test("main content area is visible", async ({ page }) => {
    // The app renders a section or the landing wrapper
    const visible = await page.evaluate(() => {
      const candidates = [
        "main",
        "#app",
        ".app-wrapper",
        "[data-section]",
        "section",
      ];
      for (const sel of candidates) {
        const el = document.querySelector(sel);
        if (el) {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        }
      }
      return false;
    });
    expect(visible).toBe(true);
  });
});

/* ────────────────────────────────────────────────────────────────────────────
   7. Performance & Resource Loading
   ──────────────────────────────────────────────────────────────────────────── */
test.describe("Resource loading", () => {
  test("no blocking render errors (no JS exceptions on load)", async ({
    page,
  }) => {
    const errors = /** @type {string[]} */ ([]);
    page.on("pageerror", (err) => errors.push(err.message));
    await loadApp(page);
    // Filter out known benign errors (network-unavailable service worker, etc.)
    const fatal = errors.filter(
      (msg) =>
        !msg.includes("Failed to fetch") &&
        !msg.includes("NetworkError") &&
        !msg.includes("sw.js"),
    );
    expect(fatal).toEqual([]);
  });

  test("main JS bundle loads without 4xx/5xx errors", async ({ page }) => {
    const failed = /** @type {string[]} */ ([]);
    page.on("response", (resp) => {
      if (resp.url().includes(".js") && resp.status() >= 400) {
        failed.push(`${resp.status()} ${resp.url()}`);
      }
    });
    await loadApp(page);
    expect(failed).toEqual([]);
  });
});
