// @ts-check
"use strict";

/* ── Utility Functions ── */
/* ── Unique ID ── */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ── Guest Full Name Helper ── */
function guestFullName(g) {
  return (g.firstName || "") + (g.lastName ? ` ${g.lastName}` : "");
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

/**
 * Trim and length-clamp a user-supplied string.
 * @param {string|*} str   Raw input value
 * @param {number}   max   Maximum allowed character count (default 500)
 * @returns {string}       Trimmed, clamped string
 */
function sanitizeInput(str, max) {
  if (str === null || str === undefined) return "";
  return String(str)
    .trim()
    .slice(0, max || 500);
}

/* ── Schema-based sanitizer (S4.2) ──────────────────────────────────────── */

/**
 * Schema field descriptor.
 * @typedef {{ type: 'string'|'number'|'boolean'|'phone'|'email'|'url', max?: number, min?: number, enum?: string[], required?: boolean }} SanitizeField
 */

const _PHONE_RE = /^[0-9]{9,15}$/;
const _EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,253}$/;
const _SCRIPTS_RE = /<\s*script[\s>]/i;

/**
 * Sanitize an object against a field schema.
 * Unknown keys are dropped. Values are coerced to their declared type.
 * Returns `{ value, errors }` where `errors` is an array of field-level messages.
 *
 * @param {Record<string,unknown>} input   Raw key-value object (e.g. from a form)
 * @param {Record<string,SanitizeField>} schema   Field definitions
 * @returns {{ value: Record<string,unknown>, errors: string[] }}
 */
function sanitize(input, schema) {
  const value = {};
  const errors = [];

  Object.keys(schema).forEach(function (field) {
    const def = schema[field];
    const raw = Object.prototype.hasOwnProperty.call(input, field)
      ? input[field]
      : undefined;

    if (raw === undefined || raw === null || raw === "") {
      if (def.required) errors.push(`${field} is required`);
      value[field] =
        def.type === "number"
          ? (def.min ?? 0)
          : def.type === "boolean"
            ? false
            : "";
      return;
    }

    switch (def.type) {
      case "string": {
        const s = String(raw)
          .trim()
          .slice(0, def.max || 500);
        if (_SCRIPTS_RE.test(s)) {
          errors.push(`${field} contains invalid content`);
          value[field] = "";
          return;
        }
        value[field] = s;
        break;
      }
      case "number": {
        const n = Number(raw);
        if (!Number.isFinite(n)) {
          errors.push(`${field} must be a number`);
          value[field] = def.min ?? 0;
          return;
        }
        value[field] = def.min !== undefined ? Math.max(def.min, n) : n;
        value[field] =
          def.max !== undefined
            ? Math.min(def.max, /** @type{number} */ (value[field]))
            : value[field];
        break;
      }
      case "boolean":
        value[field] = Boolean(raw);
        break;
      case "phone": {
        const cleaned = cleanPhone(String(raw));
        if (!_PHONE_RE.test(cleaned)) {
          errors.push(`${field} is not a valid phone number`);
          value[field] = "";
          return;
        }
        value[field] = cleaned;
        break;
      }
      case "email": {
        const em = String(raw).trim().toLowerCase().slice(0, 254);
        if (!_EMAIL_RE.test(em)) {
          errors.push(`${field} is not a valid email`);
          value[field] = "";
          return;
        }
        value[field] = em;
        break;
      }
      case "url": {
        if (!isValidHttpsUrl(String(raw))) {
          errors.push(`${field} must be a valid HTTPS URL`);
          value[field] = "";
          return;
        }
        value[field] = String(raw).trim().slice(0, 2048);
        break;
      }
      default:
        value[field] = String(raw)
          .trim()
          .slice(0, def.max || 500);
    }

    if (def.enum && !def.enum.includes(/** @type{string} */ (value[field]))) {
      errors.push(`${field} has invalid value`);
      value[field] = def.enum[0] || "";
    }
  });

  return { value, errors };
}

/**
 * Return true if the supplied value is a valid HTTPS URL or an empty string.
 * Empty / absent values are considered valid (field is optional).
 */
function isValidHttpsUrl(url) {
  if (!url) return true;
  try {
    const u = new URL(url);
    return u.protocol === "https:";
  } catch (_e) {
    return false;
  }
}

function cleanPhone(phone) {
  let p = phone.replace(/[\s\-()]/g, "");
  if (p.startsWith("0")) p = `972${p.slice(1)}`;
  if (!p.startsWith("972") && !p.startsWith("+")) p = `972${p}`;
  return p.replace(/^\+/, "");
}

function formatDateHebrew(dateStr) {
  try {
    const d = new Date(`${dateStr}T00:00:00`);
    const locale = window._currentLang === "he" ? "he-IL" : "en-US";
    return d.toLocaleDateString(locale, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Jerusalem",
    });
  } catch (_e) {
    return dateStr;
  }
}

/* ── Particles ── */
function initParticles() {
  for (let i = 0; i < 20; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    p.style.left = `${Math.random() * 100}%`;
    p.style.animationDelay = `${Math.random() * 8}s`;
    p.style.animationDuration = `${6 + Math.random() * 6}s`;
    const sz = `${2 + Math.random() * 4}px`;
    p.style.width = sz;
    p.style.height = sz;
    window.el.particles.appendChild(p);
  }
}
