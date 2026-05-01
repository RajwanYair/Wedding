/**
 * src/utils/dns-cname.js — S128 vanity-domain DNS helpers.
 *
 * Pure helpers that validate a custom domain and produce the DNS
 * records the user must add at their registrar. No network calls.
 * @owner sections
 */

const DOMAIN_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
const RESERVED = new Set([
  "localhost",
  "example.com",
  "example.org",
  "example.net",
  "invalid",
  "test",
]);

/** Normalise to lowercase and strip protocol / path / trailing dot. */
export function normalizeDomain(/** @type {string} */ input) {
  if (typeof input !== "string") return "";
  let d = input.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "");
  return d;
}

/** Validate a fully-qualified domain. Returns `{ ok, error? }`. */
export function validateDomain(/** @type {string} */ input) {
  const d = normalizeDomain(input);
  if (!d) return { ok: false, error: "empty" };
  if (d.length > 253) return { ok: false, error: "too_long" };
  if (RESERVED.has(d)) return { ok: false, error: "reserved" };
  if (!DOMAIN_RE.test(d)) return { ok: false, error: "invalid_format" };
  return { ok: true, domain: d };
}

/** Detect apex (`example.com`) vs sub-domain (`rsvp.example.com`). */
export function isApex(/** @type {string} */ domain) {
  const d = normalizeDomain(domain);
  if (!d) return false;
  return d.split(".").length === 2;
}

/**
 * Build the DNS records the user must create.
 * Apex domains use ALIAS / ANAME (or A-record fallback list); sub-domains
 * use a simple CNAME to the GitHub Pages target.
 *
 * @param {string} domain
 * @param {string} target — e.g. "rajwanyair.github.io"
 */
export function buildDnsInstructions(domain, target = "rajwanyair.github.io") {
  const v = validateDomain(domain);
  if (!v.ok) return { ok: false, error: v.error };
  if (isApex(v.domain ?? "")) {
    return {
      ok: true,
      domain: v.domain ?? "",
      records: [
        { type: "ALIAS", host: "@", value: target, ttl: 3600 },
        { type: "A", host: "@", value: "185.199.108.153", ttl: 3600 },
        { type: "A", host: "@", value: "185.199.109.153", ttl: 3600 },
        { type: "A", host: "@", value: "185.199.110.153", ttl: 3600 },
        { type: "A", host: "@", value: "185.199.111.153", ttl: 3600 },
      ],
    };
  }
  const host = (v.domain ?? "").split(".").slice(0, -2).join(".");
  return {
    ok: true,
    domain: v.domain ?? "",
    records: [{ type: "CNAME", host, value: target, ttl: 3600 }],
  };
}
