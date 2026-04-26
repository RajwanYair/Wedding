/**
 * src/sections/gallery.js — Gallery section ESM module (S0.8)
 *
 * Photo gallery with lazy-loaded images and admin upload controls.
 */

import { storeGet, storeSet, storeSubscribe } from "../core/store.js";
import { el } from "../core/dom.js";
import { t } from "../core/i18n.js";
import { uid } from "../utils/misc.js";
import { loadSession } from "../services/auth.js";
import { enqueueWrite, syncStoreKeyToSheets } from "../services/sheets.js";

/** @type {(() => void)[]} */
const _unsubs = [];

export function mount(/** @type {HTMLElement} */ _container) {
  _unsubs.push(storeSubscribe("gallery", renderGallery));
  // Show admin bar for authenticated users only
  const adminBar = document.getElementById("galleryAdminBar");
  if (adminBar) {
    const user = loadSession();
    adminBar.classList.toggle("u-hidden", !user || !user.isAdmin);
  }
  renderGallery();
}

export function unmount() {
  _unsubs.forEach((fn) => fn());
  _unsubs.length = 0;
}

/**
 * Handle file input change — upload images from device.
 * Reads each selected file as a data-URL and adds to the gallery store.
 * @param {HTMLInputElement} input
 */
export function handleGalleryUpload(input) {
  const files = Array.from(input.files ?? []);
  files.forEach((file) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = /** @type {string} */ (e.target?.result);
      if (url) addGalleryPhoto({ url, caption: file.name.replace(/\.[^.]+$/, "") });
    };
    reader.readAsDataURL(file);
  });
  // Reset so the same file can be re-selected
  input.value = "";
}

/**
 * Add a photo to the gallery.
 * @param {{ url: string, caption?: string, credit?: string }} photo
 */
export function addGalleryPhoto(photo) {
  const gallery = [.../** @type {any[]} */ (storeGet("gallery") ?? [])];
  gallery.push({ id: uid(), ...photo, addedAt: new Date().toISOString() });
  storeSet("gallery", gallery);
  enqueueWrite("gallery", () => syncStoreKeyToSheets("gallery"));
}

/**
 * @param {string} id
 */
export function deleteGalleryPhoto(id) {
  const gallery = /** @type {any[]} */ (storeGet("gallery") ?? []).filter((p) => p.id !== id);
  storeSet("gallery", gallery);
  enqueueWrite("gallery", () => syncStoreKeyToSheets("gallery"));
}

/**
 * Open a lightbox showing a full-size photo.
 * @param {string} id
 */
export function openLightbox(id) {
  const gallery = /** @type {any[]} */ (storeGet("gallery") ?? []);
  const photo = gallery.find((p) => p.id === id);
  if (!photo) return;

  // Remove existing lightbox
  document.getElementById("galleryLightbox")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "galleryLightbox";
  overlay.className = "gallery-lightbox";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", photo.caption || t("photo"));

  const inner = document.createElement("div");
  inner.className = "gallery-lightbox-inner";

  const img = document.createElement("img");
  img.className = "gallery-lightbox-img";
  img.alt = photo.caption || t("photo");
  img.decoding = "async"; // S4.6 — decode off main thread
  if (photo.url && (photo.url.startsWith("https://") || photo.url.startsWith("data:image/"))) {
    img.src = photo.url;
  }

  const closeBtn = document.createElement("button");
  closeBtn.className = "gallery-lightbox-close btn-icon";
  closeBtn.setAttribute("aria-label", t("close") || "סגור");
  closeBtn.textContent = "✕";
  closeBtn.addEventListener("click", () => overlay.remove());

  if (photo.caption) {
    const cap = document.createElement("p");
    cap.className = "gallery-lightbox-caption";
    cap.textContent = photo.caption;
    inner.appendChild(cap);
  }

  inner.appendChild(img);
  inner.appendChild(closeBtn);
  overlay.appendChild(inner);
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
  // Keyboard close
  const keyHandler = (/** @type {KeyboardEvent} */ e) => {
    if (/** @type {KeyboardEvent} */ (e).key === "Escape") {
      overlay.remove();
      document.removeEventListener("keydown", keyHandler);
    }
  };
  document.addEventListener("keydown", keyHandler);
}

export function renderGallery() {
  const grid = el.galleryGrid;
  if (!grid) return;

  const photos = /** @type {any[]} */ (storeGet("gallery") ?? []);
  const user = loadSession();
  const isAdmin = user && user.isAdmin;
  const emptyEl = document.getElementById("galleryEmpty");

  grid.textContent = "";

  if (photos.length === 0) {
    if (emptyEl) emptyEl.classList.remove("u-hidden");
    return;
  }
  if (emptyEl) emptyEl.classList.add("u-hidden");

  photos.forEach((p) => {
    const item = document.createElement("div");
    item.className = "gallery-item";
    item.dataset.id = p.id;

    const img = document.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";
    img.alt = p.caption || t("photo");
    img.className = "gallery-item-img";
    // Use a safe URL — only set src if url is a data: or https: URL
    if (p.url && (p.url.startsWith("https://") || p.url.startsWith("data:image/"))) {
      img.src = p.url;
    }
    img.addEventListener("click", () => openLightbox(p.id));
    item.appendChild(img);

    if (p.caption) {
      const cap = document.createElement("p");
      cap.className = "gallery-caption";
      cap.textContent = p.caption;
      item.appendChild(cap);
    }

    if (isAdmin) {
      const delBtn = document.createElement("button");
      delBtn.className = "btn btn-small btn-danger gallery-delete-btn";
      delBtn.textContent = "🗑";
      delBtn.setAttribute("aria-label", t("delete") || "מחק");
      delBtn.dataset.action = "deleteGalleryPhoto";
      delBtn.dataset.actionArg = p.id;
      item.appendChild(delBtn);
    }

    grid.appendChild(item);
  });
}

/**
 * Gallery stats — total photos, photos with captions, storage size estimate.
 * @returns {{ total: number, withCaption: number, avgCaptionLength: number }}
 */
export function getGalleryStats() {
  const photos = /** @type {any[]} */ (storeGet("gallery") ?? []);
  const withCaption = photos.filter((p) => p.caption);
  const totalCaptionLength = withCaption.reduce((s, p) => s + (p.caption || "").length, 0);
  return {
    total: photos.length,
    withCaption: withCaption.length,
    avgCaptionLength: withCaption.length ? Math.round(totalCaptionLength / withCaption.length) : 0,
  };
}
