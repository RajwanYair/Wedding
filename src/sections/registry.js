/**
 * src/sections/registry.js — Gift registry section ESM module (S0.8)
 * S173: Migrated to BaseSection lifecycle.
 *
 * Displays gift registry links (read-only for guests).
 */

import { storeGet, storeSet } from "../core/store.js";
import { t } from "../core/i18n.js";
import { BaseSection, fromSection } from "../core/section-base.js";

class RegistrySection extends BaseSection {
  onMount() {
    this.subscribe("weddingInfo", renderRegistry);
    renderRegistry();
  }
}

export const { mount, unmount, capabilities } = fromSection(new RegistrySection("registry"));

export function renderRegistry() {
  const info = /** @type {Record<string, string>} */ (storeGet("weddingInfo") ?? {});
  const container = document.getElementById("registryLinks");
  if (!container) return;
  container.textContent = "";

  const registryLinks = /** @type {string[]} */ (JSON.parse(info.registryLinks || "[]"));
  if (registryLinks.length === 0) {
    const msg = document.createElement("p");
    msg.textContent = t("registry_empty");
    container.appendChild(msg);
    return;
  }

  registryLinks.forEach((url) => {
    if (!url.startsWith("https://")) return; // security: only https links
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.className = "registry-link btn btn-secondary";
    a.textContent = new URL(url).hostname.replace("www.", "");
    container.appendChild(a);
  });
}

/**
 * Add a new registry link to the weddingInfo store.
 * @param {{ url: string, name?: string }} link
 */
export function addLink(link) {
  if (!link.url.startsWith("https://")) return;
  const info = /** @type {Record<string, string>} */ (storeGet("weddingInfo") ?? {});
  const existing = JSON.parse(info.registryLinks || "[]");
  if (!existing.includes(link.url)) {
    existing.push(link.url);
    storeSet("weddingInfo", {
      ...info,
      registryLinks: JSON.stringify(existing),
    });
  }
}
