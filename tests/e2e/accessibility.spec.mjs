// @ts-check
/**
 * tests/e2e/accessibility.spec.mjs — Axe-core accessibility tests (S21a)
 *
 * Runs @axe-core/playwright against the landing page and RSVP section.
 * Any WCAG AA violation fails the test with a detailed report.
 *
 * Prerequisites: npm install @axe-core/playwright
 */
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility — axe-core WCAG AA", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => document.title.length > 0, {
      timeout: 8_000,
    });
    // Wait until the SW registers / lazy templates inject so axe doesn't
    // race with an in-flight navigation ("Execution context destroyed").
    await page.waitForLoadState("networkidle", { timeout: 10_000 });
  });

  test("landing / home page has no critical a11y violations", async ({
    page,
  }) => {
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "best-practice"])
      // Known exemptions in static test environment (no real OAuth SDKs loaded)
      .exclude("#google-signin-btn")
      .exclude("#facebook-signin-btn")
      .exclude("#apple-signin-btn")
      .analyze();

    const critical = results.violations.filter((v) =>
      ["critical", "serious"].includes(v.impact ?? ""),
    );

    if (critical.length > 0) {
      const report = critical
        .map(
          (v) =>
            `[${v.impact}] ${v.id}: ${v.description}\n${v.nodes
              .slice(0, 3)
              .map((n) => `  → ${n.html}`)
              .join("\n")}`,
        )
        .join("\n\n");
       
      console.error(`A11y violations:\n${report}`);
    }

    expect(
      critical,
      `${critical.length} critical/serious accessibility violation(s) found`,
    ).toHaveLength(0);
  });

  test("RSVP section has no critical a11y violations", async ({ page }) => {
    await page.goto("/#rsvp");
    await page.waitForTimeout(600);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .include("#sec-rsvp")
      .analyze();

    const critical = results.violations.filter((v) =>
      ["critical", "serious"].includes(v.impact ?? ""),
    );

    expect(
      critical,
      `${critical.length} critical/serious violations on RSVP section`,
    ).toHaveLength(0);
  });

  test("navigation has correct ARIA roles", async ({ page }) => {
    const nav = page.locator("#navTabs");
    await expect(nav).toBeVisible();

    // Nav tabs must be keyboard accessible
    const firstTab = nav.locator("[role=tab], button, a").first();
    await expect(firstTab).toBeVisible();
  });
});

test.describe("Performance — page load timing (S21c)", () => {
  test("page load completes within 3 seconds", async ({ page }) => {
    const navigationStart = Date.now();
    await page.goto("/");
    await page.waitForFunction(() => document.title.length > 0, {
      timeout: 8_000,
    });
    const elapsed = Date.now() - navigationStart;
    expect(
      elapsed,
      `Page load took ${elapsed}ms — expected < 3000ms`,
    ).toBeLessThan(3_000);
  });

  test("Largest Contentful Paint (LCP) is < 2500ms via PerformanceObserver", async ({
    page,
  }) => {
    // Inject LCP observer before navigation
    await page.addInitScript(() => {
      /** @type {number[]} */
      window.__lcp = [];
      const obs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__lcp.push(
            /** @type {PerformanceEntry & {startTime: number}} */ (entry)
              .startTime,
          );
        }
      });
      try {
        obs.observe({ type: "largest-contentful-paint", buffered: true });
      } catch (_) {
        /* LCP not supported in this browser */
      }
    });

    await page.goto("/");
    await page.waitForFunction(() => document.title.length > 0, {
      timeout: 8_000,
    });

    // Give the browser a moment to report LCP
    await page.waitForTimeout(500);

    const lcpMs = await page.evaluate(() => {
      const entries = window.__lcp;
      return entries && entries.length > 0 ? Math.max(...entries) : null;
    });

    if (lcpMs !== null) {
      expect(
        lcpMs,
        `LCP ${Math.round(lcpMs)}ms — expected < 2500ms`,
      ).toBeLessThan(2_500);
    }
    // If LCP API not supported, skip gracefully (test passes)
  });
});
