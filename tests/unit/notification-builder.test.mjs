import { describe, it, expect, beforeEach } from "vitest";
import {
  NOTIFICATION_TYPES,
  SEVERITY,
  buildRsvpNotification,
  buildCheckinNotification,
  buildGuestNotification,
  buildVendorNotification,
  buildBudgetNotification,
  buildSystemNotification,
} from "../../src/utils/notification-builder.js";

// ── NOTIFICATION_TYPES / SEVERITY ─────────────────────────────────────────

describe("NOTIFICATION_TYPES", () => {
  it("is frozen", () => {
    expect(Object.isFrozen(NOTIFICATION_TYPES)).toBe(true);
  });

  it("has guest lifecycle keys", () => {
    expect(NOTIFICATION_TYPES.GUEST_RSVP_CONFIRMED).toBeDefined();
    expect(NOTIFICATION_TYPES.GUEST_RSVP_DECLINED).toBeDefined();
    expect(NOTIFICATION_TYPES.GUEST_CHECKED_IN).toBeDefined();
    expect(NOTIFICATION_TYPES.GUEST_ADDED).toBeDefined();
    expect(NOTIFICATION_TYPES.GUEST_UPDATED).toBeDefined();
  });

  it("has vendor lifecycle keys", () => {
    expect(NOTIFICATION_TYPES.VENDOR_PAYMENT_DUE).toBeDefined();
    expect(NOTIFICATION_TYPES.VENDOR_PAYMENT_MADE).toBeDefined();
    expect(NOTIFICATION_TYPES.VENDOR_ADDED).toBeDefined();
  });

  it("has budget keys", () => {
    expect(NOTIFICATION_TYPES.BUDGET_OVER_LIMIT).toBeDefined();
    expect(NOTIFICATION_TYPES.BUDGET_MILESTONE).toBeDefined();
  });

  it("has system keys", () => {
    expect(NOTIFICATION_TYPES.SYNC_COMPLETED).toBeDefined();
    expect(NOTIFICATION_TYPES.SYNC_FAILED).toBeDefined();
    expect(NOTIFICATION_TYPES.UPDATE_AVAILABLE).toBeDefined();
    expect(NOTIFICATION_TYPES.OFFLINE).toBeDefined();
    expect(NOTIFICATION_TYPES.ONLINE).toBeDefined();
  });
});

describe("SEVERITY", () => {
  it("is frozen with expected values", () => {
    expect(Object.isFrozen(SEVERITY)).toBe(true);
    expect(SEVERITY.INFO).toBe("info");
    expect(SEVERITY.SUCCESS).toBe("success");
    expect(SEVERITY.WARNING).toBe("warning");
    expect(SEVERITY.ERROR).toBe("error");
  });
});

// ── shared shape helper ────────────────────────────────────────────────────

/**
 * Asserts that a notification has the required fields.
 * @param {unknown} notif
 */
function assertShape(notif) {
  expect(notif).toHaveProperty("id");
  expect(notif).toHaveProperty("type");
  expect(notif).toHaveProperty("severity");
  expect(notif).toHaveProperty("title");
  expect(notif).toHaveProperty("message");
  expect(notif).toHaveProperty("timestamp");
  expect(typeof notif.id).toBe("string");
  expect(typeof notif.timestamp).toBe("number");
}

// ── buildRsvpNotification ──────────────────────────────────────────────────

describe("buildRsvpNotification()", () => {
  it("returns correct shape", () => {
    assertShape(buildRsvpNotification({ name: "Dana", status: "confirmed" }));
  });

  it("uses GUEST_RSVP_CONFIRMED type and success severity for confirmed", () => {
    const notif = buildRsvpNotification({ name: "Dana", status: "confirmed" });
    expect(notif.type).toBe(NOTIFICATION_TYPES.GUEST_RSVP_CONFIRMED);
    expect(notif.severity).toBe(SEVERITY.SUCCESS);
    expect(notif.message).toContain("Dana");
  });

  it("uses GUEST_RSVP_DECLINED type and info severity for declined", () => {
    const notif = buildRsvpNotification({ name: "Barak", status: "declined" });
    expect(notif.type).toBe(NOTIFICATION_TYPES.GUEST_RSVP_DECLINED);
    expect(notif.severity).toBe(SEVERITY.INFO);
    expect(notif.message).toContain("Barak");
  });

  it("defaults to 'Guest' when name is missing", () => {
    const notif = buildRsvpNotification({ status: "confirmed" });
    expect(notif.message).toContain("Guest");
  });

  it("attaches guest data", () => {
    const guest = { name: "Noa", status: "confirmed" };
    const notif = buildRsvpNotification(guest);
    expect(notif.data).toEqual({ guest });
  });

  it("generates unique IDs for successive calls", () => {
    const a = buildRsvpNotification({ name: "A", status: "confirmed" });
    const b = buildRsvpNotification({ name: "B", status: "confirmed" });
    expect(a.id).not.toBe(b.id);
  });
});

// ── buildCheckinNotification ───────────────────────────────────────────────

describe("buildCheckinNotification()", () => {
  it("returns correct shape", () => {
    assertShape(buildCheckinNotification({ name: "Tal" }));
  });

  it("uses GUEST_CHECKED_IN type", () => {
    const notif = buildCheckinNotification({ name: "Tal" });
    expect(notif.type).toBe(NOTIFICATION_TYPES.GUEST_CHECKED_IN);
    expect(notif.severity).toBe(SEVERITY.SUCCESS);
  });

  it("includes table number when available", () => {
    const notif = buildCheckinNotification({ name: "Mia", tableNumber: 5 });
    expect(notif.message).toContain("Table 5");
  });

  it("omits table info when tableNumber is null", () => {
    const notif = buildCheckinNotification({ name: "Mia", tableNumber: null });
    expect(notif.message).not.toContain("Table");
  });

  it("defaults to 'Guest' when name is missing", () => {
    const notif = buildCheckinNotification({});
    expect(notif.message).toContain("Guest");
  });
});

// ── buildGuestNotification ────────────────────────────────────────────────

describe("buildGuestNotification()", () => {
  it("uses GUEST_ADDED type for 'added'", () => {
    const notif = buildGuestNotification("added", { name: "Lior" });
    expect(notif.type).toBe(NOTIFICATION_TYPES.GUEST_ADDED);
    expect(notif.severity).toBe(SEVERITY.INFO);
    expect(notif.message).toContain("Lior");
  });

  it("uses GUEST_UPDATED type for 'updated'", () => {
    const notif = buildGuestNotification("updated", { name: "Lior" });
    expect(notif.type).toBe(NOTIFICATION_TYPES.GUEST_UPDATED);
    expect(notif.message).toContain("Lior");
  });

  it("returns correct shape", () => {
    assertShape(buildGuestNotification("added", { name: "X" }));
  });
});

// ── buildVendorNotification ────────────────────────────────────────────────

describe("buildVendorNotification()", () => {
  it("uses VENDOR_PAYMENT_DUE type and warning severity", () => {
    const notif = buildVendorNotification("payment_due", { name: "Florist", amount: 2000 });
    expect(notif.type).toBe(NOTIFICATION_TYPES.VENDOR_PAYMENT_DUE);
    expect(notif.severity).toBe(SEVERITY.WARNING);
    expect(notif.message).toContain("Florist");
  });

  it("uses VENDOR_PAYMENT_MADE type and success severity", () => {
    const notif = buildVendorNotification("payment_made", { name: "Florist", amount: 2000 });
    expect(notif.type).toBe(NOTIFICATION_TYPES.VENDOR_PAYMENT_MADE);
    expect(notif.severity).toBe(SEVERITY.SUCCESS);
  });

  it("uses VENDOR_ADDED type for 'added'", () => {
    const notif = buildVendorNotification("added", { name: "DJ" });
    expect(notif.type).toBe(NOTIFICATION_TYPES.VENDOR_ADDED);
    expect(notif.severity).toBe(SEVERITY.INFO);
  });

  it("includes amount in message when provided", () => {
    const notif = buildVendorNotification("payment_due", { name: "Caterer", amount: 5000, currency: "USD" });
    expect(notif.message).toContain("5,000");
    expect(notif.message).toContain("USD");
  });

  it("defaults to 'Vendor' when name missing", () => {
    const notif = buildVendorNotification("added", {});
    expect(notif.message).toContain("Vendor");
  });

  it("returns correct shape", () => {
    assertShape(buildVendorNotification("added", { name: "Band" }));
  });
});

// ── buildBudgetNotification ────────────────────────────────────────────────

describe("buildBudgetNotification()", () => {
  it("returns BUDGET_OVER_LIMIT and error severity when over budget", () => {
    const notif = buildBudgetNotification({ spent: 12000, budget: 10000, currency: "ILS" });
    expect(notif.type).toBe(NOTIFICATION_TYPES.BUDGET_OVER_LIMIT);
    expect(notif.severity).toBe(SEVERITY.ERROR);
    expect(notif.message).toContain("over budget");
  });

  it("returns BUDGET_MILESTONE and warning severity when within budget", () => {
    const notif = buildBudgetNotification({ spent: 7500, budget: 10000, milestone: 75 });
    expect(notif.type).toBe(NOTIFICATION_TYPES.BUDGET_MILESTONE);
    expect(notif.severity).toBe(SEVERITY.WARNING);
    expect(notif.message).toContain("75%");
  });

  it("calculates percentage automatically when milestone not given", () => {
    const notif = buildBudgetNotification({ spent: 5000, budget: 10000 });
    expect(notif.message).toContain("50%");
  });

  it("returns correct shape", () => {
    assertShape(buildBudgetNotification({ spent: 1000, budget: 5000 }));
  });
});

// ── buildSystemNotification ────────────────────────────────────────────────

describe("buildSystemNotification()", () => {
  const cases = [
    ["sync_completed", NOTIFICATION_TYPES.SYNC_COMPLETED, SEVERITY.SUCCESS],
    ["sync_failed", NOTIFICATION_TYPES.SYNC_FAILED, SEVERITY.ERROR],
    ["update_available", NOTIFICATION_TYPES.UPDATE_AVAILABLE, SEVERITY.INFO],
    ["offline", NOTIFICATION_TYPES.OFFLINE, SEVERITY.WARNING],
    ["online", NOTIFICATION_TYPES.ONLINE, SEVERITY.SUCCESS],
  ];

  for (const [key, type, severity] of cases) {
    it(`handles key "${key}"`, () => {
      const notif = buildSystemNotification(key);
      expect(notif.type).toBe(type);
      expect(notif.severity).toBe(severity);
      assertShape(notif);
    });
  }

  it("falls back gracefully for unknown keys", () => {
    const notif = buildSystemNotification("custom_event");
    expect(notif.type).toMatch(/^system_/);
    expect(notif.severity).toBe(SEVERITY.INFO);
  });

  it("attaches optional data payload", () => {
    const data = { version: "9.6.0" };
    const notif = buildSystemNotification("update_available", data);
    expect(notif.data).toEqual(data);
  });

  it("returns correct shape", () => {
    assertShape(buildSystemNotification("sync_completed"));
  });
});
