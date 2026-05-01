import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { formatMessage } from "../../src/utils/icu-format.js";

const he = JSON.parse(readFileSync(new URL("../../src/i18n/he.json", import.meta.url), "utf8"));
const en = JSON.parse(readFileSync(new URL("../../src/i18n/en.json", import.meta.url), "utf8"));

describe("S581 — HE ICU plural × gender keys", () => {
  it("rsvp confirmed gendered (HE)", () => {
    expect(formatMessage(he.icu_rsvp_confirmed_gendered, { gender: "female" }, "he")).toBe("אישרה הגעה");
    expect(formatMessage(he.icu_rsvp_confirmed_gendered, { gender: "male" }, "he")).toBe("אישר הגעה");
    expect(formatMessage(he.icu_rsvp_confirmed_gendered, { gender: "other" }, "he")).toBe("אישרו הגעה");
  });

  it("rsvp declined gendered (HE)", () => {
    expect(formatMessage(he.icu_rsvp_declined_gendered, { gender: "female" }, "he")).toBe("לא תוכל להגיע");
    expect(formatMessage(he.icu_rsvp_declined_gendered, { gender: "male" }, "he")).toBe("לא יוכל להגיע");
  });

  it("seat assignment interpolates table + gender (HE)", () => {
    expect(formatMessage(he.icu_seat_assignment_gendered, { gender: "female", table: 7 }, "he")).toBe(
      "הושיבה ליד שולחן 7",
    );
  });

  it("attending compound — plural × gender (HE)", () => {
    expect(formatMessage(he.icu_attending_compound, { count: 0, gender: "female" }, "he")).toBe(
      "אף אחד עדיין לא אישר",
    );
    expect(formatMessage(he.icu_attending_compound, { count: 1, gender: "female" }, "he")).toBe(
      "אורחת אחת אישרה",
    );
    expect(formatMessage(he.icu_attending_compound, { count: 2, gender: "female" }, "he")).toBe(
      "שני אורחים אישרו",
    );
    expect(formatMessage(he.icu_attending_compound, { count: 5, gender: "female" }, "he")).toBe(
      "5 אורחים אישרו",
    );
  });

  it("EN parity falls back to neutral phrasing", () => {
    expect(formatMessage(en.icu_rsvp_confirmed_gendered, { gender: "female" }, "en")).toBe(
      "She confirmed attendance",
    );
    expect(formatMessage(en.icu_attending_compound, { count: 5 }, "en")).toBe("5 guests are coming");
  });
});
