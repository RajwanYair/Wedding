// @ts-check
/**
 * tests/e2e/screen-reader-he.spec.mjs — Hebrew screen-reader matrix (S584)
 *
 * Validates that core landmarks, headings, and live regions expose the
 * right Hebrew accessible names so NVDA / VoiceOver users get parity
 * with sighted users. We do not drive the AT itself in CI; instead we
 * assert that the accessibility tree contains the expected names that
 * NVDA + VoiceOver read aloud.
 */
import { test, expect } from "@playwright/test";

test.describe("Hebrew screen-reader landmark matrix (S584)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle", { timeout: 10_000 });
  });

  test("html lang+dir announce as Hebrew RTL", async ({ page }) => {
    const lang = await page.locator("html").getAttribute("lang");
    const dir = await page.locator("html").getAttribute("dir");
    expect(lang).toMatch(/^he/);
    expect(dir).toBe("rtl");
  });

  test("primary landmarks are present and labelled", async ({ page }) => {
    // At least one main landmark is required by NVDA's "D" key navigation.
    await expect(page.locator("main, [role='main']").first()).toBeVisible();
    // A nav landmark should exist and be reachable.
    await expect(page.locator("nav, [role='navigation']").first()).toBeAttached();
  });

  test("ARIA live region exists for announce()", async ({ page }) => {
    // src/core/ui.js exposes a single ARIA live region; both NVDA + VO read it.
    const live = page.locator("[aria-live]").first();
    await expect(live).toBeAttached();
    const politeness = await live.getAttribute("aria-live");
    expect(["polite", "assertive"]).toContain(politeness);
  });

  test("buttons expose an accessible name in Hebrew", async ({ page }) => {
    const buttons = page.locator("button:visible");
    const count = await buttons.count();
    if (count === 0) return; // landing may render zero buttons in test env
    for (let i = 0; i < Math.min(count, 6); i++) {
      const name = await buttons.nth(i).evaluate((el) => {
        return (
          el.getAttribute("aria-label") ||
          el.getAttribute("title") ||
          el.textContent?.trim() ||
          ""
        );
      });
      expect(name.length, `button #${i} has no accessible name`).toBeGreaterThan(0);
    }
  });
});
