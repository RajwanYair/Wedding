/**
 * src/sections/registry.js — Gift registry section ESM module (S0.8)
 *
 * Displays gift registry links (read-only for guests).
 */

import { storeGet, storeSet, storeSubscribe } from "../core/store.js";
import { t } from "../core/i18n.js";

/** @type {(() => void)[]} */
const _unsubs = [];

export function mount(_container) {
  _unsubs.push(storeSubscribe("weddingInfo", renderRegistry));
  renderRegistry();
}

export function unmount() {
  _unsubs.forEach((fn) => fn());
  _unsubs.length = 0;
}

export function renderRegistry() {
  const info = /** @type {Record<string, string>} */ (
    storeGet("weddingInfo") ?? {}
  );
  const container = document.getElementById("registryLinks");
  if (!container) return;
  container.textContent = "";

  const registryLinks = /** @type {string[]} */ (
    JSON.parse(info.registryLinks || "[]")
  );
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
  const info = /** @type {Record<string, string>} */ (
    storeGet("weddingInfo") ?? {}
  );
  const existing = JSON.parse(info.registryLinks || "[]");
  if (!existing.includes(link.url)) {
    existing.push(link.url);
    storeSet("weddingInfo", {
      ...info,
      registryLinks: JSON.stringify(existing),
    });
  }
}
