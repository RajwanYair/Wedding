/**
 * src/services/nfc.js — Web NFC check-in wrapper (S23)
 *
 * Wraps the NDEFReader API for tap-to-check-in. Handles permission,
 * scan lifecycle, and error recovery. Safe to import everywhere —
 * `isNFCSupported()` guards all actual browser calls.
 *
 * Usage:
 *   const stop = await startNFCScan(onRecord);  // begin scanning
 *   stop();                                      // end scanning
 *
 * NFC record format written per-guest (via writeNFCTag):
 *   { type: "json", payload: { guestId: "...", event: "wedding_checkin" } }
 *
 * No window.* side-effects. ESM. Zero runtime deps.
 */

// ── Types ─────────────────────────────────────────────────────────────────

/**
 * @typedef {{ guestId: string, event: string }} NFCCheckinPayload
 */

// ── Feature detection ─────────────────────────────────────────────────────

/**
 * True when the Web NFC API (NDEFReader) is available.
 * Requires Chrome for Android 89+ with "WebNFC" flag or production enable.
 * @returns {boolean}
 */
export function isNFCSupported() {
  // Use globalThis so this works in both browser (window === globalThis) and test env
  return typeof globalThis !== "undefined" && typeof globalThis.NDEFReader === "function";
}

// ── Core scan API ─────────────────────────────────────────────────────────

/**
 * Start listening for NDEF records. Calls `onRecord(payload)` for each
 * matching wedding check-in record.
 *
 * @param {(payload: NFCCheckinPayload) => void} onRecord
 * @param {object} [options]
 * @param {string} [options.recordType]   NDEF record type to match (default "text")
 * @returns {Promise<() => void>}  Resolves to a stop function — call to end scan
 * @throws {Error} if NFC is not supported or permission is denied
 */
export async function startNFCScan(onRecord, { recordType = "text" } = {}) {
  if (!isNFCSupported()) {
    throw new Error("Web NFC not supported on this device");
  }

  // NDEFReader is only available in browser; cast for type safety
  const NDEFReader = /** @type {any} */ (globalThis.NDEFReader);
  const reader = new NDEFReader();

  /** @type {AbortController} */
  const controller = new AbortController();

  reader.addEventListener("reading", (/** @type {any} */ event) => {
    for (const record of event.message.records) {
      if (record.recordType === recordType) {
        try {
          const decoder = new TextDecoder();
          const text = decoder.decode(record.data);
          const payload = /** @type {NFCCheckinPayload} */ (JSON.parse(text));
          if (payload?.guestId && payload?.event === "wedding_checkin") {
            onRecord(payload);
          }
        } catch {
          // Unreadable record — ignore
        }
      }
    }
  });

  reader.addEventListener("readingerror", () => {
    // Non-fatal scan error — log but keep scanning
    console.warn("[NFC] Reading error — scanner still active");
  });

  await reader.scan({ signal: controller.signal });

  // Return stop function
  return function stopNFCScan() {
    controller.abort();
  };
}

// ── Write API ─────────────────────────────────────────────────────────────

/**
 * Write a wedding check-in record to the NFC tag currently in range.
 *
 * @param {string} guestId
 * @returns {Promise<void>}
 * @throws {Error} if NFC is not supported or write fails
 */
export async function writeNFCTag(guestId) {
  if (!isNFCSupported()) {
    throw new Error("Web NFC not supported on this device");
  }
  const NDEFReader = /** @type {any} */ (globalThis.NDEFReader);
  const writer = new NDEFReader();

  const payload = JSON.stringify({ guestId, event: "wedding_checkin" });
  const encoder = new TextEncoder();

  await writer.write({
    records: [{
      recordType: "text",
      data: encoder.encode(payload),
    }],
  });
}
