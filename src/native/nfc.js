/**
 * @file NFC bridge — native (Capacitor `@capawesome-team/capacitor-nfc`)
 * with a Web NFC fallback (`window.NDEFReader` on Android Chrome).
 *
 * Encoded payload format: `wedding:guest:<id>` (URI record, RTD `U`).
 *
 * @owner native-bridge
 */
/* global DOMException */

import { isNative } from "./platform.js";

const PAYLOAD_PREFIX = "wedding:guest:";

/**
 * @param {string} guestId
 * @returns {string}
 */
export function encodeGuestPayload(guestId) {
  if (typeof guestId !== "string" || guestId.length === 0) {
    throw new TypeError("encodeGuestPayload: guestId must be a non-empty string");
  }
  return `${PAYLOAD_PREFIX}${guestId}`;
}

/**
 * @param {string} payload
 * @returns {string | null} guestId or null if payload is not ours
 */
export function decodeGuestPayload(payload) {
  if (typeof payload !== "string") return null;
  if (!payload.startsWith(PAYLOAD_PREFIX)) return null;
  const id = payload.slice(PAYLOAD_PREFIX.length);
  return id.length > 0 ? id : null;
}

/** @returns {Promise<boolean>} true if the runtime can read NFC tags */
export async function isNfcAvailable() {
  if (isNative()) {
    try {
      const mod = await import(/* @vite-ignore */ "@capawesome-team/capacitor-nfc");
      const { isSupported } = await mod.Nfc.isSupported();
      return Boolean(isSupported);
    } catch {
      return false;
    }
  }
  return typeof globalThis !== "undefined" && "NDEFReader" in globalThis;
}

/**
 * Read a single NFC tag.
 * @param {{ signal?: AbortSignal }} [opts]
 * @returns {Promise<string | null>} guestId or null
 */
export async function readGuestTag(opts = {}) {
  if (isNative()) {
    const mod = await import(/* @vite-ignore */ "@capawesome-team/capacitor-nfc");
    const { Nfc } = mod;
    return new Promise((resolve, reject) => {
      const onScan = (ev) => {
        const records = ev?.nfcTag?.message?.records ?? [];
        for (const r of records) {
          const text = r?.payload ?? "";
          const id = decodeGuestPayload(typeof text === "string" ? text : new TextDecoder().decode(new Uint8Array(text)));
          if (id) {
            Nfc.removeAllListeners?.();
            Nfc.stopScanSession?.();
            return resolve(id);
          }
        }
      };
      opts.signal?.addEventListener("abort", () => {
        Nfc.removeAllListeners?.();
        Nfc.stopScanSession?.();
        reject(new DOMException("aborted", "AbortError"));
      });
      Nfc.addListener("nfcTagScanned", onScan);
      Nfc.startScanSession().catch(reject);
    });
  }
  if (typeof globalThis === "undefined" || !("NDEFReader" in globalThis)) {
    throw new Error("NFC not supported on this device");
  }
  const NDEFReaderCtor = /** @type {{ NDEFReader: new () => any }} */ (globalThis).NDEFReader;
  const reader = new NDEFReaderCtor();
  await reader.scan({ signal: opts.signal });
  return new Promise((resolve, reject) => {
    reader.onreading = (ev) => {
      for (const r of ev.message.records) {
        const text = new TextDecoder().decode(r.data);
        const id = decodeGuestPayload(text);
        if (id) return resolve(id);
      }
      resolve(null);
    };
    reader.onreadingerror = () => reject(new Error("NFC read failed"));
  });
}

/**
 * Write a guest payload to a tag.
 * @param {string} guestId
 * @returns {Promise<void>}
 */
export async function writeGuestTag(guestId) {
  const payload = encodeGuestPayload(guestId);
  if (isNative()) {
    const { Nfc } = await import(/* @vite-ignore */ "@capawesome-team/capacitor-nfc");
    await Nfc.write({ message: { records: [{ recordType: "uri", payload }] } });
    return;
  }
  if (typeof globalThis === "undefined" || !("NDEFReader" in globalThis)) {
    throw new Error("NFC not supported on this device");
  }
  const NDEFReaderCtor = /** @type {{ NDEFReader: new () => any }} */ (globalThis).NDEFReader;
  const writer = new NDEFReaderCtor();
  await writer.write({ records: [{ recordType: "url", data: payload }] });
}
