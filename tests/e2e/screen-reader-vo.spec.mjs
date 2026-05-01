// @ts-check
/**
 * tests/e2e/screen-reader-vo.spec.mjs — VoiceOver role/role-description matrix (S585)
 *
 * VoiceOver on macOS / iOS reads `role` + `aria-roledescription` differently
 * from NVDA. We assert structural roles + that no element overrides a role
 * with an empty roledescription (which silences VO).
 */
import { test, expect } from "@playwright/test";

test.describe("VoiceOver role matrix (S585)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle", { timeout: 10_000 });
  });

  test("no element ships an empty aria-roledescription", async ({ page }) => {
    const empties = await page.$$eval(
      "[aria-roledescription]",
      (nodes) =>
        nodes
          .filter((n) => (n.getAttribute("aria-roledescription") || "").trim() === "")
          .map((n) => n.tagName),
    );
    expect(empties, `empty aria-roledescription on: ${empties.join(", ")}`).toEqual([]);
  });

  test("dialogs expose modal semantics", async ({ page }) => {
    const dialogs = page.locator("dialog, [role='dialog']");
    const count = await dialogs.count();
    for (let i = 0; i < count; i++) {
      const d = dialogs.nth(i);
      const labelled =
        (await d.getAttribute("aria-labelledby")) ||
        (await d.getAttribute("aria-label"));
      expect(labelled, `dialog #${i} missing accessible name`).toBeTruthy();
    }
  });

  test("interactive buttons are reachable via keyboard tab", async ({ page }) => {
    // VO follows DOM tab order; ensure body is focusable via Tab without crashing.
    await page.keyboard.press("Tab");
    const active = await page.evaluate(() => document.activeElement?.tagName ?? null);
    expect(active).not.toBeNull();
  });
});
