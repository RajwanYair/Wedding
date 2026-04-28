/**
 * src/services/dns-instructions.js — S154 DNS record guidance for custom domains.
 *
 * Generates DNS record instructions for connecting a custom domain to
 * various hosting providers (GitHub Pages, Vercel, Netlify, Cloudflare Pages, Render).
 *
 * Pure functions — no DOM, no side effects.
 */

/**
 * @typedef {{ type: string, name: string, value: string, ttl?: string, note?: string }} DnsRecord
 * @typedef {{ provider: string, labelKey: string, records: DnsRecord[], docsUrl: string }} DnsInstructions
 */

/** @type {ReadonlyArray<DnsInstructions>} */
export const DNS_PROVIDERS = Object.freeze([
  {
    provider: "github-pages",
    labelKey: "dns_provider_github",
    docsUrl: "https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site",
    records: [
      { type: "CNAME", name: "www", value: "<username>.github.io", note: "dns_note_replace_username" },
      { type: "A", name: "@", value: "185.199.108.153" },
      { type: "A", name: "@", value: "185.199.109.153" },
      { type: "A", name: "@", value: "185.199.110.153" },
      { type: "A", name: "@", value: "185.199.111.153" },
    ],
  },
  {
    provider: "vercel",
    labelKey: "dns_provider_vercel",
    docsUrl: "https://vercel.com/docs/projects/domains",
    records: [
      { type: "CNAME", name: "www", value: "cname.vercel-dns.com" },
      { type: "A", name: "@", value: "76.76.21.21" },
    ],
  },
  {
    provider: "netlify",
    labelKey: "dns_provider_netlify",
    docsUrl: "https://docs.netlify.com/domains-https/custom-domains/",
    records: [
      { type: "CNAME", name: "www", value: "<site-name>.netlify.app", note: "dns_note_replace_site" },
      { type: "A", name: "@", value: "75.2.60.5", note: "dns_note_netlify_lb" },
    ],
  },
  {
    provider: "cloudflare-pages",
    labelKey: "dns_provider_cloudflare",
    docsUrl: "https://developers.cloudflare.com/pages/configuration/custom-domains/",
    records: [
      { type: "CNAME", name: "www", value: "<project>.pages.dev", note: "dns_note_replace_project" },
      { type: "CNAME", name: "@", value: "<project>.pages.dev", note: "dns_note_cf_root_cname" },
    ],
  },
  {
    provider: "render",
    labelKey: "dns_provider_render",
    docsUrl: "https://docs.render.com/custom-domains",
    records: [
      { type: "CNAME", name: "www", value: "<service>.onrender.com", note: "dns_note_replace_service" },
      { type: "A", name: "@", value: "216.24.57.1" },
    ],
  },
]);

/**
 * Get DNS instructions for a specific provider.
 * @param {string} providerKey
 * @returns {DnsInstructions | undefined}
 */
export function getDnsInstructions(providerKey) {
  return DNS_PROVIDERS.find((p) => p.provider === providerKey);
}

/**
 * Format a DNS record as a human-readable line.
 * @param {DnsRecord} record
 * @returns {string}
 */
export function formatDnsRecord(record) {
  const ttl = record.ttl ?? "3600";
  return `${record.type}\t${record.name}\t${record.value}\t${ttl}`;
}

/**
 * Get all provider keys.
 * @returns {string[]}
 */
export function getProviderKeys() {
  return DNS_PROVIDERS.map((p) => p.provider);
}
