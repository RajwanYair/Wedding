// @ts-check
/**
 * tests/e2e/visual-locale-rtl.spec.mjs — S592 visual regression per-locale RTL parity
 *
 * Captures the landing page in each shipped locale and stores a
 * baseline. RTL locales (he, ar) must mirror layout vs LTR (en, fr, es, ru).
 * First run: `npx playwright test tests/e2e/visual-locale-rtl.spec.mjs --update-snapshots`
 */
import { test, expect } from "@playwright/test";

const LOCALES = /** @type {const} */ ([
  { code: "he", dir: "rtl" },
  { code: "ar", dir: "rtl" },
  { code: "en", dir: "ltr" },
  { code: "fr", dir: "ltr" },
  { code: "es", dir: "ltr" },
  { code: "ru", dir: "ltr" },
]);

for (const { code, dir } of LOCALES) {
  test.describe(`Visual locale parity — ${code} (${dir})`, () => {
    test.use({ viewport: { width: 1280, height: 720 }, locale: code });

    test(`landing renders ${code} with dir=${dir}`, async ({ page }) => {
      await page.addInitScript((lang) => {
        try {
          localStorage.setItem("wedding_v1_lang", lang);
        } catch {
          /* ignore */
        }
      }, code);

      await page.goto("/");
      await page.waitForLoadState("networkidle", { timeout: 10_000 });
      await page.waitForTimeout(250);

      // For RTL locales, html dir should match.
      const htmlDir = await page.locator("html").getAttribute("dir");
      if (dir === "rtl") {
        expect(htmlDir).toBe("rtl");
      }

      await expect(page).toHaveScreenshot(`landing-${code}.png`, {
        maxDiffPixelRatio: 0.04,
        fullPage: false,
      });
    });
  });
}
