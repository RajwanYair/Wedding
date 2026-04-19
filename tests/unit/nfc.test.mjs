/**
 * tests/unit/nfc.test.mjs — Web NFC service (S23)
 */
import { describe, it, expect, vi, afterEach } from "vitest";

function installNDEFReader(MockClass) { globalThis.NDEFReader = MockClass; }
function uninstallNDEFReader() { globalThis.NDEFReader = undefined; }

describe("isNFCSupported()", () => {
  afterEach(uninstallNDEFReader);
  it("returns false when NDEFReader is absent", async () => {
    uninstallNDEFReader();
    const { isNFCSupported } = await import("../../src/services/nfc.js");
    expect(isNFCSupported()).toBe(false);
  });
  it("returns true when NDEFReader is a class", async () => {
    installNDEFReader(class MockNDEF {});
    const { isNFCSupported } = await import("../../src/services/nfc.js");
    expect(isNFCSupported()).toBe(true);
  });
});

describe("writeNFCTag()", () => {
  afterEach(uninstallNDEFReader);
  it("throws when NFC not supported", async () => {
    uninstallNDEFReader();
    const { writeNFCTag } = await import("../../src/services/nfc.js");
    await expect(writeNFCTag("guest-123")).rejects.toThrow("Web NFC not supported");
  });
  it("calls writer.write with correct NDEF payload", async () => {
    const mockWrite = vi.fn().mockResolvedValue(undefined);
    installNDEFReader(class { write = mockWrite; });
    const { writeNFCTag } = await import("../../src/services/nfc.js");
    await writeNFCTag("guest-abc");
    expect(mockWrite).toHaveBeenCalledOnce();
    const arg = mockWrite.mock.calls[0][0];
    expect(arg.records).toHaveLength(1);
    expect(arg.records[0].recordType).toBe("text");
    const decoded = new TextDecoder().decode(arg.records[0].data);
    const payload = JSON.parse(decoded);
    expect(payload.guestId).toBe("guest-abc");
    expect(payload.event).toBe("wedding_checkin");
  });
});

describe("startNFCScan()", () => {
  afterEach(uninstallNDEFReader);
  it("throws when NFC not supported", async () => {
    uninstallNDEFReader();
    const { startNFCScan } = await import("../../src/services/nfc.js");
    await expect(startNFCScan(() => {})).rejects.toThrow("Web NFC not supported");
  });
  it("returns a stop function that aborts the scan", async () => {
    const abortFn = vi.fn();
    const OrigController = globalThis.AbortController;
    class MockAbortController { abort = abortFn; signal = { aborted: false }; }
    globalThis.AbortController = MockAbortController;
    const mockScan = vi.fn().mockResolvedValue(undefined);
    installNDEFReader(class { addEventListener() {} scan = mockScan; });
    const { startNFCScan } = await import("../../src/services/nfc.js");
    const stop = await startNFCScan(() => {});
    expect(typeof stop).toBe("function");
    stop();
    expect(abortFn).toHaveBeenCalled();
    globalThis.AbortController = OrigController;
  });
  it("calls onRecord when a wedding_checkin record arrives", async () => {
    const onRecord = vi.fn();
    const mockScan = vi.fn().mockResolvedValue(undefined);
    const listeners = {};
    const payload = JSON.stringify({ guestId: "g1", event: "wedding_checkin" });
    const encoded = new TextEncoder().encode(payload);
    installNDEFReader(class {
      addEventListener(evt, handler) { listeners[evt] = handler; }
      scan = mockScan;
    });
    const { startNFCScan } = await import("../../src/services/nfc.js");
    await startNFCScan(onRecord);
    listeners.reading?.({ message: { records: [{ recordType: "text", data: encoded }] } });
    expect(onRecord).toHaveBeenCalledWith({ guestId: "g1", event: "wedding_checkin" });
  });
  it("ignores non-wedding_checkin records", async () => {
    const onRecord = vi.fn();
    const mockScan = vi.fn().mockResolvedValue(undefined);
    const listeners = {};
    const encoded = new TextEncoder().encode(JSON.stringify({ type: "other" }));
    installNDEFReader(class {
      addEventListener(evt, handler) { listeners[evt] = handler; }
      scan = mockScan;
    });
    const { startNFCScan } = await import("../../src/services/nfc.js");
    await startNFCScan(onRecord);
    listeners.reading?.({ message: { records: [{ recordType: "text", data: encoded }] } });
    expect(onRecord).not.toHaveBeenCalled();
  });
});
