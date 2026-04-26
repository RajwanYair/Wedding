// @ts-check
/**
 * tests/e2e/_helpers.mjs — shared E2E utilities.
 *
 * `seedAdminSession(page)` writes a synthetic admin user into localStorage
 * BEFORE any page navigation so that `loadSession()` finds it during boot
 * and the section auth guard allows admin-only sections (guests, tables,
 * vendors, etc.) to mount during smoke tests.
 *
 * The session matches the AuthUser shape in `src/services/auth.js` and
 * uses the `wedding_v1_` storage prefix declared in `src/core/config.js`
 * for the default (non-event-scoped) namespace.
 */

import { expect } from "@playwright/test";

const STORAGE_PREFIX = "wedding_v1_";
const SESSION_KEY = `${STORAGE_PREFIX}auth_user`;

/**
 * Seed an admin session into localStorage before navigation.
 * Must be called BEFORE `page.goto(...)`.
 * @param {import("@playwright/test").Page} page
 */
export async function seedAdminSession(page) {
  await page.addInitScript(
    ({ key, user }) => {
      try {
        localStorage.setItem(key, JSON.stringify(user));
      } catch {
        /* localStorage unavailable in some test contexts */
      }
    },
    {
      key: SESSION_KEY,
      user: {
        uid: "e2e-admin",
        email: "e2e@test.local",
        name: "E2E Admin",
        picture: "",
        provider: "test",
        isAdmin: true,
        loginAt: Date.now(),
      },
    },
  );
}

/**
 * Wait until a lazy-loaded section template has injected content.
 * @param {import("@playwright/test").Page} page
 * @param {string} sectionId DOM id of the section container, e.g. "sec-guests"
 * @param {number} [timeout=15_000]
 */
export async function waitForSection(page, sectionId, timeout = 15_000) {
  const container = page.locator(`#${sectionId}`);
  await expect(container).toBeAttached({ timeout });
  // Section template is injected lazily; wait until it has at least one child.
  await page.waitForFunction(
    (id) => {
      const el = document.getElementById(id);
      return !!el && el.children.length > 0;
    },
    sectionId,
    { timeout },
  );
}
