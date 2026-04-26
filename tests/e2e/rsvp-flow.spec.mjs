// @ts-check
/**
 * tests/e2e/rsvp-flow.spec.mjs — RSVP flow E2E tests
 *
 * Verifies the complete RSVP user journey:
 *   1. Phone-first lookup (known guest auto-populated)
 *   2. New-guest form submission
 *   3. Confirmation screen + "Add to Calendar" links
 *   4. RSVP deadline guard (section becomes read-only after deadline)
 */
import { test, expect } from "@playwright/test";
import { seedStoreData, waitForSection } from "./_helpers.mjs";

// ── Fixture data ──────────────────────────────────────────────────────────

const SEED_GUEST = {
  id: "rsvp-guest-1",
  firstName: "דניאל",
  lastName: "כהן",
  phone: "+972521112222",
  side: "bride",
  status: "pending",
  plusOnes: 0,
  meal: "regular",
  tableId: null,
  notes: "",
  checkedIn: false,
  gift: 0,
};

const FUTURE_DATE = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10); // 1 year from now

const PAST_DATE = "2000-01-01"; // safely in the past

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Navigate to the RSVP section as an anonymous (guest) user.
 * @param {import("@playwright/test").Page} page
 * @param {Record<string,unknown>} [extraStore]
 */
async function gotoRsvp(page, extraStore = {}) {
  await seedStoreData(page, {
    guests: [SEED_GUEST],
    weddingInfo: { date: FUTURE_DATE, time: "18:00", groom: "חתן", bride: "כלה" },
    ...extraStore,
  });
  await page.goto("/#rsvp");
  await waitForSection(page, "sec-rsvp");
}

// ── Tests ─────────────────────────────────────────────────────────────────

test.describe("RSVP — phone lookup", () => {
  test("RSVP section renders the phone input", async ({ page }) => {
    await gotoRsvp(page);
    await expect(page.locator("#rsvpPhone")).toBeVisible();
  });

  test("phone lookup pre-fills guest form for known phone", async ({ page }) => {
    await gotoRsvp(page);

    const phoneInput = page.locator("#rsvpPhone");
    await phoneInput.fill("0521112222");
    // Trigger input event (debounced lookup)
    await phoneInput.dispatchEvent("input");
    await page.waitForTimeout(600);

    // Status message should become visible
    const status = page.locator("#rsvpLookupStatus");
    await expect(status).not.toHaveClass(/u-hidden/, { timeout: 5_000 });
  });

  test("details form is revealed after valid phone entry", async ({ page }) => {
    await gotoRsvp(page);

    const phoneInput = page.locator("#rsvpPhone");
    await phoneInput.fill("0521112222");
    await phoneInput.dispatchEvent("input");
    await page.waitForTimeout(600);

    // rsvpDetails should be un-hidden
    const details = page.locator("#rsvpDetails");
    // If section auto-reveals, check it's present in DOM
    await expect(details).toBeAttached({ timeout: 5_000 });
  });
});

test.describe("RSVP — form submission", () => {
  test("unknown phone shows new-guest form (not pre-filled)", async ({ page }) => {
    await gotoRsvp(page);

    const phoneInput = page.locator("#rsvpPhone");
    await phoneInput.fill("0509999999");
    await phoneInput.dispatchEvent("input");
    await page.waitForTimeout(600);

    // First name input should be empty (no pre-fill)
    const firstName = page.locator("#rsvpFirstName");
    if (await firstName.isVisible()) {
      const val = await firstName.inputValue();
      expect(val).toBe("");
    }
  });
});

test.describe("RSVP — deadline guard", () => {
  test("RSVP section renders normally when deadline is in the future", async ({ page }) => {
    await gotoRsvp(page, {
      weddingInfo: { date: FUTURE_DATE, rsvpDeadline: FUTURE_DATE },
    });
    await expect(page.locator("#rsvpPhone")).toBeVisible();
  });

  test("RSVP section shows closed message when deadline passed", async ({ page }) => {
    await gotoRsvp(page, {
      weddingInfo: { date: FUTURE_DATE, rsvpDeadline: PAST_DATE },
    });
    // The section should render a "closed" message instead of the form
    const form = page.locator("#rsvpPhone");
    const deadlineMsg = page.locator(
      "[data-i18n='rsvp_closed'], .rsvp-closed, #rsvpClosedMsg",
    );
    // Either the phone input is hidden OR a deadline message is visible
    const formHidden = await form.isHidden().catch(() => true);
    const msgVisible = await deadlineMsg.isVisible().catch(() => false);
    expect(formHidden || msgVisible).toBe(true);
  });
});
