import { describe, it, expect, vi, afterEach } from "vitest";
import { impact, selectionChanged, notificationSuccess } from "../../src/native/haptics.js";
import { share, canShare } from "../../src/native/share.js";

describe("native/haptics — web fallback", () => {
  afterEach(() => {
    delete globalThis.Capacitor;
    delete globalThis.navigator;
  });

  it("impact() vibrates with a medium pattern by default", async () => {
    const vibrate = vi.fn();
    globalThis.navigator = { vibrate };
    await impact();
    expect(vibrate).toHaveBeenCalledWith([25]);
  });

  it("impact('light') uses a 10ms pattern", async () => {
    const vibrate = vi.fn();
    globalThis.navigator = { vibrate };
    await impact("light");
    expect(vibrate).toHaveBeenCalledWith([10]);
  });

  it("notificationSuccess() vibrates with a triple pattern", async () => {
    const vibrate = vi.fn();
    globalThis.navigator = { vibrate };
    await notificationSuccess();
    expect(vibrate).toHaveBeenCalledWith([10, 30, 10]);
  });

  it("selectionChanged() vibrates with 5ms", async () => {
    const vibrate = vi.fn();
    globalThis.navigator = { vibrate };
    await selectionChanged();
    expect(vibrate).toHaveBeenCalledWith(5);
  });

  it("is a no-op when no vibrate API is present", async () => {
    globalThis.navigator = {};
    await expect(impact()).resolves.toBeUndefined();
  });
});

describe("native/share — web fallback", () => {
  afterEach(() => {
    delete globalThis.Capacitor;
    delete globalThis.navigator;
  });

  it("rejects when neither text nor url is provided", async () => {
    await expect(share({})).rejects.toThrow(TypeError);
  });

  it("returns false when no share API is available", async () => {
    globalThis.navigator = {};
    await expect(share({ text: "hi" })).resolves.toBe(false);
  });

  it("uses navigator.share when available and reports success", async () => {
    const nativeShare = vi.fn().mockResolvedValue(undefined);
    globalThis.navigator = { share: nativeShare };
    await expect(share({ text: "rsvp", url: "https://x" })).resolves.toBe(true);
    expect(nativeShare).toHaveBeenCalledWith({ title: undefined, text: "rsvp", url: "https://x" });
  });

  it("treats user cancellation as success", async () => {
    const err = new Error("cancel");
    err.name = "AbortError";
    globalThis.navigator = { share: vi.fn().mockRejectedValue(err) };
    await expect(share({ text: "x" })).resolves.toBe(true);
  });

  it("canShare reflects navigator.share availability", async () => {
    globalThis.navigator = { share: () => undefined };
    await expect(canShare()).resolves.toBe(true);
    globalThis.navigator = {};
    await expect(canShare()).resolves.toBe(false);
  });
});
