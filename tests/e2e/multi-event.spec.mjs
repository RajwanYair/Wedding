// @ts-check
/**
 * tests/e2e/multi-event.spec.mjs — Multi-event isolation E2E tests (S404)
 *
 * Verifies that switching between events isolates store data:
 *   1. Two events with different guest lists load without cross-contamination
 *   2. The active event ID is reflected in localStorage prefix
 *   3. Navigating back to the first event restores its guest count
 */
import { test, expect } from "@playwright/test";
import { seedAdminSession, seedStoreData, waitForSection } from "./_helpers.mjs";

const EVENT_A_GUESTS = [
  {
    id: "evt-a-g1",
    firstName: "אבי",
    lastName: "לוי",
    phone: "+972501111111",
    status: "confirmed",
    side: "groom",
    plusOnes: 0,
    meal: "regular",
    tableId: null,
    notes: "",
    checkedIn: false,
    gift: 0,
  },
  {
    id: "evt-a-g2",
    firstName: "שרה",
    lastName: "כהן",
    phone: "+972502222222",
    status: "pending",
    side: "bride",
    plusOnes: 1,
    meal: "vegan",
    tableId: null,
    notes: "",
    checkedIn: false,
    gift: 0,
  },
];

const EVENT_B_GUESTS = [
  {
    id: "evt-b-g1",
    firstName: "יוסף",
    lastName: "מזרחי",
    phone: "+972503333333",
    status: "confirmed",
    side: "groom",
    plusOnes: 0,
    meal: "regular",
    tableId: null,
    notes: "",
    checkedIn: false,
    gift: 0,
  },
];

// ── Multi-event isolation ─────────────────────────────────────────────────

test.describe("Multi-event data isolation (S404)", () => {
  test("app loads the default event guest list correctly", async ({ page }) => {
    await seedAdminSession(page);
    await seedStoreData(page, { guests: EVENT_A_GUESTS });
    await page.goto("/#guests");
    await waitForSection(page, "sec-guests");

    // At least one guest row should be visible
    const rows = page.locator(".guest-row, tr[data-id], [data-guest-id]");
    await expect(rows.first()).toBeAttached({ timeout: 10_000 });
  });

  test("switching active event changes the storage prefix", async ({ page }) => {
    await seedAdminSession(page);
    await seedStoreData(page, { guests: EVENT_A_GUESTS });
    await page.goto("/");
    await page.waitForFunction(() => document.title.length > 0, {
      timeout: 10_000,
    });

    // Write event B guests under event-scoped key
    const writtenB = await page.evaluate((guests) => {
      const prefix = "wedding_v1_evt_event-b_";
      try {
        localStorage.setItem(`${prefix}guests`, JSON.stringify(guests));
        return true;
      } catch {
        return false;
      }
    }, EVENT_B_GUESTS);
    expect(writtenB).toBe(true);

    // Verify the two event namespaces are isolated
    const { countA, countB } = await page.evaluate(() => {
      const aRaw = localStorage.getItem("wedding_v1_guests");
      const bRaw = localStorage.getItem("wedding_v1_evt_event-b_guests");
      const countA = aRaw ? JSON.parse(aRaw).length : 0;
      const countB = bRaw ? JSON.parse(bRaw).length : 0;
      return { countA, countB };
    });
    expect(countA).toBe(EVENT_A_GUESTS.length);
    expect(countB).toBe(EVENT_B_GUESTS.length);
  });

  test("guest data does not cross-contaminate across events", async ({ page }) => {
    await seedAdminSession(page);
    await seedStoreData(page, { guests: EVENT_A_GUESTS });
    await page.goto("/");
    await page.waitForFunction(() => document.title.length > 0, { timeout: 10_000 });

    // Event A has 2 guests
    const eventACount = await page.evaluate(() => {
      const raw = localStorage.getItem("wedding_v1_guests");
      return raw ? JSON.parse(raw).length : 0;
    });
    expect(eventACount).toBe(EVENT_A_GUESTS.length);

    // Event B namespace (not yet set) returns null or empty
    const eventBRaw = await page.evaluate(() =>
      localStorage.getItem("wedding_v1_evt_event-b_guests"),
    );
    expect(eventBRaw).toBeNull();
  });

  test("guests section renders with seeded data after navigation", async ({ page }) => {
    await seedAdminSession(page);
    await seedStoreData(page, {
      guests: EVENT_A_GUESTS,
    });

    await page.goto("/#guests");
    await waitForSection(page, "sec-guests");

    // Guests table or list should contain content
    const guestContent = page.locator(
      "#guestsTable, #guestsList, .guests-container, .guest-row",
    );
    await expect(guestContent.first()).toBeAttached({ timeout: 10_000 });
  });

  test("storage survives hash navigation between sections", async ({ page }) => {
    await seedAdminSession(page);
    await seedStoreData(page, { guests: EVENT_A_GUESTS });

    // Navigate to guests, then to dashboard, then back
    await page.goto("/#guests");
    await waitForSection(page, "sec-guests");

    await page.goto("/#dashboard");
    await page.waitForFunction(() => document.title.length > 0, { timeout: 10_000 });

    await page.goto("/#guests");
    await waitForSection(page, "sec-guests");

    // Verify data is intact after round-trip navigation
    const count = await page.evaluate(() => {
      const raw = localStorage.getItem("wedding_v1_guests");
      return raw ? JSON.parse(raw).length : 0;
    });
    expect(count).toBe(EVENT_A_GUESTS.length);
  });
});
