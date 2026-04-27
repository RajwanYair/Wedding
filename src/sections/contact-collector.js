/**
 * src/sections/contact-collector.js — Contact collection section (S0.8)
 *
 * Lets guests submit their contact details (phone, email, dietary).
 */

import { storeGet, storeSet } from "../core/store.js";
import { t } from "../core/i18n.js";
import { cleanPhone, isValidPhone } from "../utils/phone.js";
import { sanitize } from "../utils/sanitize.js";
import { uid } from "../utils/misc.js";
import { enqueueWrite, syncStoreKeyToSheets } from "../core/sync.js";

/** @type {HTMLElement|null} */
let _container = null;

export function mount(/** @type {HTMLElement} */ container) {
  _container = container;
}
export function unmount() {
  _container = null;
}

/**
 * @param {Record<string, unknown>} data
 * @returns {{ ok: boolean, errors?: string[] }}
 */
export function submitContactForm(data) {
  const { value, errors } = sanitize(data, {
    firstName: { type: "string", required: true, maxLength: 80 },
    lastName: { type: "string", required: false, maxLength: 80 },
    phone: { type: "string", required: true },
    email: { type: "string", required: false, maxLength: 120 },
    dietaryNotes: { type: "string", required: false, maxLength: 300 },
  });
  if (errors.length) return { ok: false, errors };

  const phone = cleanPhone(String(value.phone));
  if (!isValidPhone(phone)) return { ok: false, errors: [t("error_invalid_phone")] };

  const contacts = [.../** @type {any[]} */ (storeGet("contacts") ?? [])];
  contacts.push({
    id: uid(),
    ...value,
    phone,
    submittedAt: new Date().toISOString(),
  });
  storeSet("contacts", contacts);
  enqueueWrite("contacts", () => syncStoreKeyToSheets("contacts"));

  // Show success
  const form = document.getElementById("contactFormFields");
  const success = document.getElementById("contactFormSuccess");
  if (form) form.classList.add("u-hidden");
  if (success) success.classList.remove("u-hidden");

  return { ok: true };
}

// ── Sprint 2: Contacts CSV export ─────────────────────────────────────────

/**
 * Export collected contacts as a CSV file download.
 */
export function exportContactsCSV() {
  const contacts = /** @type {any[]} */ (storeGet("contacts") ?? []);
  const header = "Name,Phone,Email,DietaryNotes,SubmittedAt";
  const rows = contacts.map((c) =>
    [
      `"${`${c.firstName || ""} ${c.lastName || ""}`.trim().replace(/"/g, '""')}"`,
      c.phone || "",
      c.email || "",
      `"${(c.dietaryNotes || "").replace(/"/g, '""')}"`,
      c.submittedAt || "",
    ].join(","),
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "contacts.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
