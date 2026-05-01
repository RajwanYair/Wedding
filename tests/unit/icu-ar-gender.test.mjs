import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { formatMessage } from "../../src/utils/icu-format.js";

const ar = JSON.parse(readFileSync(new URL("../../src/i18n/ar.json", import.meta.url), "utf8"));

describe("S582 — AR ICU plural × gender keys", () => {
  it("rsvp confirmed gendered (AR)", () => {
    expect(formatMessage(ar.icu_rsvp_confirmed_gendered, { gender: "female" }, "ar")).toBe("أكّدت الحضور");
    expect(formatMessage(ar.icu_rsvp_confirmed_gendered, { gender: "male" }, "ar")).toBe("أكّد الحضور");
    expect(formatMessage(ar.icu_rsvp_confirmed_gendered, { gender: "other" }, "ar")).toBe("أكّدوا الحضور");
  });

  it("rsvp declined gendered (AR)", () => {
    expect(formatMessage(ar.icu_rsvp_declined_gendered, { gender: "female" }, "ar")).toBe(
      "لن تتمكّن من الحضور",
    );
    expect(formatMessage(ar.icu_rsvp_declined_gendered, { gender: "male" }, "ar")).toBe(
      "لن يتمكّن من الحضور",
    );
  });

  it("seat assignment interpolates table + gender (AR)", () => {
    expect(formatMessage(ar.icu_seat_assignment_gendered, { gender: "female", table: 7 }, "ar")).toBe(
      "جلستِ على الطاولة 7",
    );
    expect(formatMessage(ar.icu_seat_assignment_gendered, { gender: "male", table: 12 }, "ar")).toBe(
      "جلستَ على الطاولة 12",
    );
  });

  it("attending compound covers AR plural categories (zero/one/two/few/many/other)", () => {
    expect(formatMessage(ar.icu_attending_compound, { count: 0 }, "ar")).toBe("لم يؤكد أحد بعد");
    expect(formatMessage(ar.icu_attending_compound, { count: 1, gender: "female" }, "ar")).toBe(
      "ضيفة واحدة قادمة",
    );
    expect(formatMessage(ar.icu_attending_compound, { count: 2 }, "ar")).toBe("ضيفان قادمان");
    expect(formatMessage(ar.icu_attending_compound, { count: 3 }, "ar")).toBe("3 ضيوف قادمون");
    expect(formatMessage(ar.icu_attending_compound, { count: 11 }, "ar")).toBe("11 ضيفًا قادمون");
    expect(formatMessage(ar.icu_attending_compound, { count: 100 }, "ar")).toBe("100 ضيف قادم");
  });

  it("invite greeting interpolates name + gender (AR)", () => {
    expect(formatMessage(ar.icu_invite_greeting_gendered, { gender: "female", name: "ليلى" }, "ar")).toBe(
      "مرحبًا ليلى، أنتِ مدعوّة إلى حفل زفافنا",
    );
  });
});
