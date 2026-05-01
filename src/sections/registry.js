/**
 * src/sections/registry.js — Gift registry section ESM module (S0.8)
 * S173: Migrated to BaseSection lifecycle.
 * S430: Deep-link platform recognition + admin add-link form with presets.
 *
 * Displays gift registry links with platform branding for guests,
 * and an admin add-link form with known platform presets.
 */

import { storeGet, storeSet } from "../core/store.js";
import { t } from "../core/i18n.js";
import { BaseSection, fromSection } from "../core/section-base.js";
import { showToast } from "../core/ui.js";

// ── Platform registry (S430) ──────────────────────────────────────────────

/** Known gift-registry platforms with display info and preset URL templates. */
const REGISTRY_PLATFORMS = Object.freeze([
  { id: "amazon_il",   label: "Amazon IL",   icon: "📦", domain: "amazon.co.il",   url: "https://www.amazon.co.il/wedding/" },
  { id: "amazon_com",  label: "Amazon",      icon: "📦", domain: "amazon.com",     url: "https://www.amazon.com/wedding/registry/" },
  { id: "giftly",      label: "Giftly",      icon: "🎀", domain: "giftly.com",     url: "https://www.giftly.com/gift-cards" },
  { id: "buyme",       label: "BuyMe",       icon: "🛍️", domain: "buyme.co.il",    url: "https://www.buyme.co.il/wishlist" },
  { id: "wishlisted",  label: "Wishlisted",  icon: "🎁", domain: "wishlisted.app", url: "https://wishlisted.app/list/" },
  { id: "myregistry",  label: "MyRegistry",  icon: "🎊", domain: "myregistry.com", url: "https://www.myregistry.com/GiftList/Default.aspx" },
]);

/**
 * Detect platform metadata from a URL.
 * @param {string} url
 * @returns {{ label: string, icon: string } | null}
 */
function detectPlatform(url) {
  try {
    const host = new URL(url).hostname.replace("www.", "");
    const found = REGISTRY_PLATFORMS.find((p) => host === p.domain || host.endsWith(`.${p.domain}`));
    return found ? { label: found.label, icon: found.icon } : null;
  } catch {
    return null;
  }
}

class RegistrySection extends BaseSection {
  async onMount() {
    this.subscribe("weddingInfo", renderRegistry);
    renderRegistry();
    _renderPlatformPresets();
  }
}

export const { mount, unmount, capabilities } = fromSection(new RegistrySection("registry"));

function renderRegistry() {
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
    const platform = detectPlatform(url);

    const card = document.createElement("a");
    card.href = url;
    card.target = "_blank";
    card.rel = "noopener noreferrer";
    card.className = "registry-platform-card";

    const icon = document.createElement("span");
    icon.className = "registry-platform-icon";
    icon.textContent = platform?.icon ?? "🔗";
    card.appendChild(icon);

    const label = document.createElement("span");
    label.className = "registry-platform-label";
    label.textContent = platform?.label ?? new URL(url).hostname.replace("www.", "");
    card.appendChild(label);

    const arrow = document.createElement("span");
    arrow.className = "registry-platform-arrow";
    arrow.textContent = "↗";
    arrow.setAttribute("aria-hidden", "true");
    card.appendChild(arrow);

    container.appendChild(card);
  });
}

/** Render platform preset quick-add buttons (admin only). */
function _renderPlatformPresets() {
  const container = document.getElementById("registryPlatformPresets");
  if (!container) return;
  container.textContent = "";
  for (const p of REGISTRY_PLATFORMS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "registry-preset-btn";
    btn.dataset.action = "addRegistryPreset";
    btn.dataset.actionArg = p.id;
    const iconEl = document.createElement("span");
    iconEl.textContent = p.icon;
    iconEl.setAttribute("aria-hidden", "true");
    btn.appendChild(iconEl);
    const labelEl = document.createElement("span");
    labelEl.textContent = p.label;
    btn.appendChild(labelEl);
    container.appendChild(btn);
  }
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

/**
 * Handle the manual "Add Registry Link" form.
 * Validates URL, prevents duplicates.
 */
export function addRegistryLink() {
  const input = /** @type {HTMLInputElement|null} */ (document.getElementById("registryLinkInput"));
  const nameInput = /** @type {HTMLInputElement|null} */ (document.getElementById("registryLinkName"));
  const errEl = document.getElementById("registryAddError");
  const url = input?.value?.trim() ?? "";
  const _name = nameInput?.value?.trim() ?? "";

  if (!url.startsWith("https://")) {
    if (errEl) errEl.textContent = t("registry_url_invalid");
    return;
  }
  try { new URL(url); } catch {
    if (errEl) errEl.textContent = t("registry_url_invalid");
    return;
  }

  if (errEl) errEl.textContent = "";
  addLink({ url, name: _name });
  if (input) input.value = "";
  if (nameInput) nameInput.value = "";
  showToast(t("registry_link_added"), "success");
}

/**
 * Add a preset platform link — prefills the URL input with the preset URL.
 * @param {string} platformId
 */
export function addRegistryPreset(platformId) {
  const p = REGISTRY_PLATFORMS.find((pl) => pl.id === platformId);
  if (!p) return;
  const input = /** @type {HTMLInputElement|null} */ (document.getElementById("registryLinkInput"));
  const nameInput = /** @type {HTMLInputElement|null} */ (document.getElementById("registryLinkName"));
  if (input) input.value = p.url;
  if (nameInput) nameInput.value = p.label;
  input?.focus();
  showToast(t("registry_preset_filled", { platform: p.label }), "info");
}

