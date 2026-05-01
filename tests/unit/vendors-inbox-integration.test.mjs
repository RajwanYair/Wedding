/**
 * S605 — vendors section inbox unread chip integration smoke test.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SRC = readFileSync(resolve(process.cwd(), "src/sections/vendors.js"), "utf8");
const TPL = readFileSync(resolve(process.cwd(), "src/templates/vendors.html"), "utf8");

describe("S605 vendors inbox chip wiring", () => {
  it("imports groupThreads + unreadCount from utils/vendor-inbox", () => {
    expect(SRC).toMatch(/from\s+["']\.\.\/utils\/vendor-inbox\.js["']/);
    expect(SRC).toContain("groupThreads");
    expect(SRC).toContain("unreadCount");
  });

  it("template exposes #vendorInboxChip", () => {
    expect(TPL).toContain('id="vendorInboxChip"');
  });

  it("subscribes renderInboxChip to vendor_messages store key", () => {
    expect(SRC).toMatch(/this\.subscribe\(\s*["']vendor_messages["']\s*,\s*renderInboxChip\s*\)/);
  });
});
