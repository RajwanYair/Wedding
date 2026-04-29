/**
 * src/sections/website-builder.js — S139 Public wedding website builder UI.
 *
 * Consumes src/services/website-builder.js (S134) to let the couple
 * configure their public wedding website: toggle sections, set
 * visibility, preview slug, and see a live preview.
 */

import { storeGet } from "../core/store.js";
import { BaseSection, fromSection } from "../core/section-base.js";
import { t } from "../core/i18n.js";
import { showToast } from "../core/ui.js";
import {
  buildWebsiteConfig,
  buildSiteSlug,
  WEBSITE_SECTIONS,
} from "../services/website-builder.js";
import { readBrowserStorageJson, writeBrowserStorageJson } from "../core/storage.js";
import { validateDomain, buildDnsInstructions } from "../utils/dns-cname.js";

const STORAGE_KEY = "wedding_v1_website_config";

class WebsiteBuilderSection extends BaseSection {
  async onMount() {
    this.subscribe("weddingInfo", _populateFromWeddingInfo);
    _populateFromWeddingInfo();
    _renderSectionToggles();
    _loadSavedConfig();
    _wireVisibilityToggle();
    _wireSlugPreview();
    _wireDnsInstructions();
  }
}

export const { mount, unmount, capabilities } = fromSection(new WebsiteBuilderSection("website-builder"));

// ── Populate from wedding info ────────────────────────────────────────────

function _populateFromWeddingInfo() {
  const info = /** @type {Record<string,string>} */ (storeGet("weddingInfo") ?? {});
  const coupleAInput = /** @type {HTMLInputElement|null} */ (document.getElementById("wbCoupleA"));
  const coupleBInput = /** @type {HTMLInputElement|null} */ (document.getElementById("wbCoupleB"));
  const dateInput = /** @type {HTMLInputElement|null} */ (document.getElementById("wbDate"));

  if (coupleAInput && !coupleAInput.value) coupleAInput.value = info.groom ?? "";
  if (coupleBInput && !coupleBInput.value) coupleBInput.value = info.bride ?? "";
  if (dateInput && !dateInput.value) dateInput.value = info.date ?? "";

  _updateSlugPreview();
}

// ── Section toggles ───────────────────────────────────────────────────────

function _renderSectionToggles() {
  const container = document.getElementById("wbSectionToggles");
  if (!container) return;
  container.textContent = "";

  const saved = _getSavedSections();

  for (const section of WEBSITE_SECTIONS) {
    const label = document.createElement("label");
    label.className = "website-section-toggle";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = saved.includes(section);
    checkbox.dataset.section = section;

    const span = document.createElement("span");
    span.textContent = t(`website_section_${section}`) || section;

    label.appendChild(checkbox);
    label.appendChild(span);
    container.appendChild(label);
  }
}

function _getSavedSections() {
  const config = readBrowserStorageJson(STORAGE_KEY);
  return config?.sections ?? [...WEBSITE_SECTIONS];
}

// ── Visibility toggle ─────────────────────────────────────────────────────

function _wireVisibilityToggle() {
  const select = /** @type {HTMLSelectElement|null} */ (document.getElementById("wbVisibility"));
  const passGroup = document.getElementById("wbPasswordGroup");
  if (!select || !passGroup) return;

  const update = () => {
    passGroup.style.display = select.value === "password" ? "" : "none";
  };
  select.addEventListener("change", update);
  update();
}

// ── Slug preview ──────────────────────────────────────────────────────────

function _wireSlugPreview() {
  const coupleA = document.getElementById("wbCoupleA");
  const coupleB = document.getElementById("wbCoupleB");
  const dateInput = document.getElementById("wbDate");

  [coupleA, coupleB, dateInput].forEach((el) => {
    el?.addEventListener("input", _updateSlugPreview);
  });
}

function _updateSlugPreview() {
  const a = /** @type {HTMLInputElement|null} */ (document.getElementById("wbCoupleA"))?.value ?? "";
  const b = /** @type {HTMLInputElement|null} */ (document.getElementById("wbCoupleB"))?.value ?? "";
  const d = /** @type {HTMLInputElement|null} */ (document.getElementById("wbDate"))?.value ?? "";
  const year = d ? new Date(d).getFullYear() : new Date().getFullYear();
  const slug = buildSiteSlug(a, b, year);
  const preview = document.getElementById("wbSlugPreview");
  if (preview) preview.textContent = slug || "—";
}

// ── Load saved config ─────────────────────────────────────────────────────

function _loadSavedConfig() {
  const config = readBrowserStorageJson(STORAGE_KEY);
  if (!config) return;

  const coupleA = /** @type {HTMLInputElement|null} */ (document.getElementById("wbCoupleA"));
  const coupleB = /** @type {HTMLInputElement|null} */ (document.getElementById("wbCoupleB"));
  const dateInput = /** @type {HTMLInputElement|null} */ (document.getElementById("wbDate"));
  const vis = /** @type {HTMLSelectElement|null} */ (document.getElementById("wbVisibility"));
  const pass = /** @type {HTMLInputElement|null} */ (document.getElementById("wbPassword"));

  if (coupleA) coupleA.value = config.coupleA ?? "";
  if (coupleB) coupleB.value = config.coupleB ?? "";
  if (dateInput) dateInput.value = config.weddingDate ?? "";
  if (vis) vis.value = config.visibility ?? "public";
  if (pass && config.password) pass.value = config.password;

  _updateSlugPreview();
}

// ── Save config action ────────────────────────────────────────────────────

export function saveWebsiteConfig() {
  const coupleA = /** @type {HTMLInputElement|null} */ (document.getElementById("wbCoupleA"))?.value ?? "";
  const coupleB = /** @type {HTMLInputElement|null} */ (document.getElementById("wbCoupleB"))?.value ?? "";
  const weddingDate = /** @type {HTMLInputElement|null} */ (document.getElementById("wbDate"))?.value ?? "";
  const visibility = /** @type {HTMLSelectElement|null} */ (document.getElementById("wbVisibility"))?.value ?? "public";
  const password = /** @type {HTMLInputElement|null} */ (document.getElementById("wbPassword"))?.value ?? "";

  const container = document.getElementById("wbSectionToggles");
  const sections = [];
  if (container) {
    for (const input of container.querySelectorAll("input[type=checkbox]:checked")) {
      const sec = /** @type {HTMLInputElement} */ (input).dataset.section;
      if (sec) sections.push(sec);
    }
  }

  const result = buildWebsiteConfig({
    coupleA,
    coupleB,
    weddingDate,
    visibility,
    password: visibility === "password" ? password : undefined,
    sections,
  });

  if (!result.ok) {
    showToast(t("website_save_error"), "error");
    return { ok: false, errors: result.errors };
  }

  writeBrowserStorageJson(STORAGE_KEY, result.config);
  showToast(t("website_save_success"), "success");
  return { ok: true };
}

// ── Preview ───────────────────────────────────────────────────────────────

export function previewWebsite() {
  const container = document.getElementById("wbPreviewContainer");
  const content = document.getElementById("wbPreviewContent");
  if (!container || !content) return;

  const config = readBrowserStorageJson(STORAGE_KEY);
  if (!config) {
    showToast(t("website_save_first"), "warning");
    return;
  }

  container.classList.remove("u-hidden");
  content.textContent = "";

  const heading = document.createElement("h2");
  heading.textContent = `${config.coupleA} & ${config.coupleB}`;
  content.appendChild(heading);

  const date = document.createElement("p");
  date.textContent = config.weddingDate ?? "";
  content.appendChild(date);

  const sectionsList = document.createElement("ul");
  for (const s of config.sections ?? []) {
    const li = document.createElement("li");
    li.textContent = t(`website_section_${s}`) || s;
    sectionsList.appendChild(li);
  }
  content.appendChild(sectionsList);
}
// ── DNS instructions (S198 / Roadmap S154) ───────────────────────────────

function _wireDnsInstructions() {
  const input = /** @type {HTMLInputElement|null} */ (document.getElementById("wbCustomDomain"));
  const panel = document.getElementById("wbDnsInstructions");
  if (!input || !panel) return;

  input.addEventListener("input", () => {
    const raw = input.value.trim();
    panel.hidden = !raw;
    panel.textContent = "";
    if (!raw) return;

    const validation = validateDomain(raw);
    if (!validation.ok) {
      const msg = document.createElement("p");
      msg.className = "error-text";
      msg.textContent = t(`dns_error_${validation.error}`) || (validation.error ?? null);
      panel.appendChild(msg);
      return;
    }

    const result = buildDnsInstructions(validation.domain ?? "");
    if (!result.ok || !result.records) return;

    const table = document.createElement("table");
    table.className = "dns-table";
    const head = table.createTHead().insertRow();
    for (const key of ["dns_col_type", "dns_col_name", "dns_col_value", "dns_col_ttl"]) {
      const th = document.createElement("th");
      th.textContent = t(key);
      head.appendChild(th);
    }
    const tbody = table.createTBody();
    for (const rec of result.records) {
      const row = tbody.insertRow();
      for (const cell of [rec.type, rec.host, rec.value, String(rec.ttl)]) {
        const td = row.insertCell();
        td.textContent = cell;
        td.dir = "ltr";
      }
    }
    panel.appendChild(table);
  });
}
