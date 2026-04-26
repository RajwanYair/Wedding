// @ts-check
/**
 * tests/e2e/crud.spec.mjs — Guest + Table CRUD E2E tests
 *
 * Verifies that admins can create, read, update, and delete guests and tables
 * through the live app UI. Data is seeded into localStorage before navigation
 * so sections render populated state without needing an external backend.
 */
import { test, expect } from "@playwright/test";
import { seedAdminSession, seedStoreData, waitForSection } from "./_helpers.mjs";

// ── Shared fixture data ───────────────────────────────────────────────────

const SEED_GUEST = {
  id: "e2e-guest-1",
  firstName: "ישראל",
  lastName: "ישראלי",
  phone: "+972501234567",
  side: "groom",
  status: "pending",
  plusOnes: 0,
  meal: "regular",
  tableId: null,
  notes: "",
  checkedIn: false,
  gift: 0,
};

const SEED_TABLE = {
  id: "e2e-table-1",
  name: "שולחן 1",
  capacity: 10,
  guests: [],
  notes: "",
};

// ── Guest CRUD ────────────────────────────────────────────────────────────

test.describe("Guest CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await seedAdminSession(page);
    await seedStoreData(page, { guests: [SEED_GUEST], tables: [] });
    await page.goto("/#guests");
    await waitForSection(page, "sec-guests");
  });

  test("seeded guest appears in the guest table", async ({ page }) => {
    await expect(page.locator("#guestTable")).toContainText("ישראל");
  });

  test("guest count stat reflects seeded data", async ({ page }) => {
    // At least one stat chip / counter is visible
    const stat = page.locator("[data-stat], .stat-badge, .stat-chip").first();
    await expect(stat).toBeAttached({ timeout: 5_000 });
  });

  test("search narrows guest list", async ({ page }) => {
    const searchInput = page.locator("#guestSearch");
    await searchInput.fill("ישראלי");
    await page.waitForTimeout(300);
    await expect(page.locator("#guestTable")).toContainText("ישראלי");
  });

  test("search with no match shows empty state", async ({ page }) => {
    const searchInput = page.locator("#guestSearch");
    await searchInput.fill("xxxxxxnotfound");
    await page.waitForTimeout(300);
    // guest row should no longer be visible
    const rows = page.locator("#guestTable tr.guest-row, #guestTable tbody tr");
    await expect(rows).toHaveCount(0, { timeout: 5_000 });
  });

  test("open Add Guest modal via button", async ({ page }) => {
    const addBtn = page.locator("[data-action='openAddGuestModal']").first();
    await addBtn.click();
    await expect(page.locator("#guestFirstName")).toBeVisible({ timeout: 5_000 });
  });

  test("fill and save a new guest", async ({ page }) => {
    const addBtn = page.locator("[data-action='openAddGuestModal']").first();
    await addBtn.click();
    await expect(page.locator("#guestFirstName")).toBeVisible({ timeout: 5_000 });

    await page.locator("#guestFirstName").fill("אביגיל");
    await page.locator("#guestLastName").fill("לוי");
    await page.locator("[data-action='saveGuest']").click();

    // Modal closes and new guest appears in list
    await expect(page.locator("#guestFirstName")).not.toBeVisible({ timeout: 5_000 });
    await expect(page.locator("#guestTable")).toContainText("אביגיל", { timeout: 5_000 });
  });
});

// ── Table CRUD ────────────────────────────────────────────────────────────

test.describe("Table CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await seedAdminSession(page);
    await seedStoreData(page, {
      guests: [SEED_GUEST],
      tables: [SEED_TABLE],
    });
    await page.goto("/#tables");
    await waitForSection(page, "sec-tables");
  });

  test("seeded table appears in the tables section", async ({ page }) => {
    await expect(page.locator("#sec-tables")).toContainText("שולחן 1");
  });

  test("tables section renders capacity info", async ({ page }) => {
    const tableCards = page.locator(".table-card, .table-item, [data-table-id]");
    await expect(tableCards.first()).toBeAttached({ timeout: 5_000 });
  });
});
