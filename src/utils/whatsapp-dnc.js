/**
 * src/utils/whatsapp-dnc.js — S455: WhatsApp Do-Not-Contact list
 *
 * Phone-keyed opt-out list. Numbers added here should be excluded
 * from bulk WhatsApp/SMS sends. Cleaned via `cleanPhone()` so the
 * comparison works regardless of input formatting.
 *
 * Storage: `wedding_v1_dnc_list` — JSON array of cleaned phone strings.
 */

import { cleanPhone } from "./phone.js";

const STORAGE_KEY = "wedding_v1_dnc_list";

/**
 * @returns {string[]}
 */
function _read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/**
 * @param {string[]} list
 */
function _write(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* storage disabled */
  }
}

/**
 * Normalise phone for comparison; falls back to digit-only when `cleanPhone` throws.
 * @param {string|undefined} raw
 * @returns {string}
 */
function _norm(raw) {
  if (!raw) return "";
  try {
    return cleanPhone(raw);
  } catch {
    return raw.replace(/\D/g, "");
  }
}

/**
 * Add a phone number to the do-not-contact list.
 * @param {string} phone
 * @returns {boolean} `true` if added, `false` if already present or invalid.
 */
export function addToDnc(phone) {
  const norm = _norm(phone);
  if (!norm) return false;
  const list = _read();
  if (list.includes(norm)) return false;
  list.push(norm);
  _write(list);
  return true;
}

/**
 * Remove a phone number from the do-not-contact list.
 * @param {string} phone
 * @returns {boolean} `true` if removed, `false` if not present.
 */
export function removeFromDnc(phone) {
  const norm = _norm(phone);
  if (!norm) return false;
  const list = _read();
  const next = list.filter((p) => p !== norm);
  if (next.length === list.length) return false;
  _write(next);
  return true;
}

/**
 * @param {string} phone
 * @returns {boolean}
 */
export function isOnDnc(phone) {
  const norm = _norm(phone);
  if (!norm) return false;
  return _read().includes(norm);
}

/**
 * @returns {string[]}
 */
export function listDnc() {
  return _read().slice();
}

/**
 * Clear the do-not-contact list entirely.
 */
export function clearDnc() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage disabled */
  }
}

/**
 * Filter a list of phone numbers, removing any on the DNC list.
 * @param {string[]} phones
 * @returns {string[]}
 */
export function filterDnc(phones) {
  const dnc = new Set(_read());
  return phones.filter((p) => {
    const norm = _norm(p);
    return norm && !dnc.has(norm);
  });
}
