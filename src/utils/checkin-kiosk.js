/**
 * src/utils/checkin-kiosk.js — S643 Checkin kiosk helpers
 *
 * Pure helpers for NFC/QR kiosk mode: badge print data,
 * offline verification, buffer management, and session tracking.
 *
 * @module checkin-kiosk
 * @owner checkin
 */

/**
 * @typedef {object} KioskSession
 * @property {string} kioskId
 * @property {string} startedAt
 * @property {number} scansProcessed
 * @property {number} failedScans
 * @property {boolean} online
 */

/**
 * @typedef {object} BadgeData
 * @property {string} guestId
 * @property {string} guestName
 * @property {number} tableNumber
 * @property {string} meal
 * @property {string} checkedInAt
 * @property {string} [qrPayload]
 */

/**
 * Create a kiosk session.
 *
 * @param {string} kioskId
 * @returns {KioskSession}
 */
export function createSession(kioskId) {
  return {
    kioskId: kioskId || "kiosk_default",
    startedAt: new Date().toISOString(),
    scansProcessed: 0,
    failedScans: 0,
    online: true,
  };
}

/**
 * Record a successful scan in the session.
 *
 * @param {KioskSession} session
 * @returns {KioskSession}
 */
export function recordScan(session) {
  if (!session) return session;
  return { ...session, scansProcessed: session.scansProcessed + 1 };
}

/**
 * Record a failed scan in the session.
 *
 * @param {KioskSession} session
 * @returns {KioskSession}
 */
export function recordFailedScan(session) {
  if (!session) return session;
  return { ...session, failedScans: session.failedScans + 1 };
}

/**
 * Toggle online/offline status.
 *
 * @param {KioskSession} session
 * @param {boolean} online
 * @returns {KioskSession}
 */
export function setOnlineStatus(session, online) {
  if (!session) return session;
  return { ...session, online };
}

/**
 * Build badge print data from a guest record.
 *
 * @param {{ id: string, name: string, table?: number, meal?: string }} guest
 * @returns {BadgeData}
 */
export function buildBadgeData(guest) {
  return {
    guestId: guest.id,
    guestName: guest.name ?? "",
    tableNumber: guest.table ?? 0,
    meal: guest.meal ?? "",
    checkedInAt: new Date().toISOString(),
    qrPayload: `checkin:${guest.id}`,
  };
}

/**
 * Verify a QR payload against the guest list (offline-capable).
 *
 * @param {string} qrPayload — format: "checkin:<guestId>"
 * @param {Map<string, { name: string }>} guestMap — id → guest
 * @returns {{ valid: boolean, guestId?: string, guestName?: string }}
 */
export function verifyQrPayload(qrPayload, guestMap) {
  if (!qrPayload || typeof qrPayload !== "string") return { valid: false };
  const match = qrPayload.match(/^checkin:(.+)$/);
  if (!match) return { valid: false };
  const guestId = match[1];
  const guest = guestMap?.get(guestId);
  if (!guest) return { valid: false, guestId };
  return { valid: true, guestId, guestName: guest.name };
}

/**
 * Verify an NFC tag payload.
 *
 * @param {string} nfcPayload — plain guest ID
 * @param {Map<string, { name: string }>} guestMap
 * @returns {{ valid: boolean, guestId?: string, guestName?: string }}
 */
export function verifyNfcPayload(nfcPayload, guestMap) {
  if (!nfcPayload || typeof nfcPayload !== "string") return { valid: false };
  const guest = guestMap?.get(nfcPayload.trim());
  if (!guest) return { valid: false, guestId: nfcPayload.trim() };
  return { valid: true, guestId: nfcPayload.trim(), guestName: guest.name };
}

/**
 * Add to offline buffer (when kiosk is offline).
 *
 * @param {{ guestId: string, timestamp: string }[]} buffer
 * @param {string} guestId
 * @returns {{ guestId: string, timestamp: string }[]}
 */
export function bufferCheckin(buffer, guestId) {
  const arr = Array.isArray(buffer) ? [...buffer] : [];
  arr.push({ guestId, timestamp: new Date().toISOString() });
  return arr;
}

/**
 * Flush buffer (returns items and empty buffer).
 *
 * @param {{ guestId: string, timestamp: string }[]} buffer
 * @returns {{ items: { guestId: string, timestamp: string }[], buffer: [] }}
 */
export function flushBuffer(buffer) {
  return { items: Array.isArray(buffer) ? [...buffer] : [], buffer: [] };
}

/**
 * Session summary stats.
 *
 * @param {KioskSession} session
 * @returns {{ kioskId: string, uptime: number, scansProcessed: number, failedScans: number, successRate: number }}
 */
export function sessionStats(session) {
  if (!session) return { kioskId: "", uptime: 0, scansProcessed: 0, failedScans: 0, successRate: 0 };
  const total = session.scansProcessed + session.failedScans;
  const uptime = Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000);
  return {
    kioskId: session.kioskId,
    uptime,
    scansProcessed: session.scansProcessed,
    failedScans: session.failedScans,
    successRate: total > 0 ? Math.round((session.scansProcessed / total) * 100) : 0,
  };
}
