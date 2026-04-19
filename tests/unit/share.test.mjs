/**
 * tests/unit/share.test.mjs — Web Share API service (S23f)
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { isShareSupported, canShareFiles, share, shareGuestRsvpLink } from "../../src/services/share.js";

function installShare(impl) {
  Object.defineProperty(navigator, "share", { configurable: true, writable: true, value: impl });
  Object.defineProperty(navigator, "canShare", { configurable: true, writable: true, value: (data) => !!(data?.files?.length) });
}
function uninstallShare() {
  Object.defineProperty(navigator, "share", { configurable: true, writable: true, value: undefined });
  Object.defineProperty(navigator, "canShare", { configurable: true, writable: true, value: undefined });
}

describe("isShareSupported()", () => {
  afterEach(uninstallShare);
  it("returns false when navigator.share is absent", () => { uninstallShare(); expect(isShareSupported()).toBe(false); });
  it("returns true when navigator.share is a function", () => { installShare(vi.fn()); expect(isShareSupported()).toBe(true); });
});

describe("canShareFiles()", () => {
  afterEach(uninstallShare);
  it("returns false when canShare is absent", () => { uninstallShare(); expect(canShareFiles([])).toBe(false); });
  it("returns true when files are provided and canShare says yes", () => {
    installShare(vi.fn());
    const f = new File(["x"], "test.txt");
    expect(canShareFiles([f])).toBe(true);
  });
});

describe("share()", () => {
  afterEach(uninstallShare);
  it("throws when share not supported", async () => {
    uninstallShare();
    await expect(share({ title: "Test" })).rejects.toThrow("Web Share API not supported");
  });
  it("returns true on successful share", async () => {
    installShare(vi.fn().mockResolvedValue(undefined));
    expect(await share({ title: "Wedding", url: "https://example.com" })).toBe(true);
  });
  it("returns false on AbortError (user cancelled)", async () => {
    const err = new DOMException("Cancelled", "AbortError");
    installShare(vi.fn().mockRejectedValue(err));
    expect(await share({ title: "Wedding" })).toBe(false);
  });
  it("rethrows non-AbortError errors", async () => {
    installShare(vi.fn().mockRejectedValue(new Error("NotAllowedError")));
    await expect(share({ title: "Wedding" })).rejects.toThrow("NotAllowedError");
  });
});

describe("shareGuestRsvpLink()", () => {
  afterEach(uninstallShare);
  it("returns false when share is not supported", async () => {
    uninstallShare();
    expect(await shareGuestRsvpLink({ firstName: "Alice", id: "g1" })).toBe(false);
  });
  it("calls share with guest name in title", async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    installShare(mockShare);
    await shareGuestRsvpLink({ firstName: "Alice", lastName: "Cohen", id: "g1" });
    expect(mockShare).toHaveBeenCalledOnce();
    const arg = mockShare.mock.calls[0][0];
    expect(arg.title).toContain("Alice");
    expect(arg.title).toContain("Cohen");
  });
  it("encodes guestId in URL", async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    installShare(mockShare);
    await shareGuestRsvpLink({ firstName: "Bob", id: "g-test 1" });
    const { url } = mockShare.mock.calls[0][0];
    expect(url).toContain("guestId=g-test%201");
  });
});