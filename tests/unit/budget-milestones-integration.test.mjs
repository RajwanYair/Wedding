/**
 * S606 smoke test — vendor payment milestones outlook in budget section.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const SECTION = readFileSync("src/sections/budget.js", "utf8");
const TEMPLATE = readFileSync("src/templates/budget.html", "utf8");

describe("S606 budget vendor milestones outlook", () => {
  it("imports payment-milestones helpers", () => {
    expect(SECTION).toMatch(/from\s+"\.\.\/utils\/payment-milestones\.js"/);
    expect(SECTION).toMatch(/allocateMilestones/);
    expect(SECTION).toMatch(/outstandingBalance/);
  });

  it("renders into #vendorMilestonesCard", () => {
    expect(TEMPLATE).toMatch(/id="vendorMilestonesCard"/);
    expect(TEMPLATE).toMatch(/id="vendorMilestonesList"/);
    expect(TEMPLATE).toMatch(/id="vendorMilestonesSummary"/);
  });

  it("subscribes to vendors store key", () => {
    expect(SECTION).toMatch(/subscribe\("vendors",\s*renderVendorMilestones\)/);
  });
});
