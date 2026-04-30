/**
 * src/sections/gallery.js — Gallery section ESM module (S0.8)
 *
 * Photo gallery with lazy-loaded images and admin upload controls.
 */

import { storeGet, storeSet } from "../core/store.js";
import { BaseSection, fromSection } from "../core/section-base.js";
import { el } from "../core/dom.js";
import { t } from "../core/i18n.js";
import { uid } from "../utils/misc.js";
import { currentUser } from "../services/auth.js";
import { enqueueWrite, syncStoreKeyToSheets } from "../core/sync.js";
import { CDN_IMAGE_HOST } from "../core/config.js";
import { buildCdnImageUrl, buildSrcset, defaultSizes } from "../utils/cdn-image.js";
import { showToast } from "../core/ui.js";
import { vibrate, HAPTIC } from "../utils/haptic.js";
import { getSupabaseClient } from "../core/supabase-client.js";

class GallerySection extends BaseSection {
  async onMount() {
    this.subscribe("gallery", renderGallery);
    // Show admin bar for authenticated users only
    const adminBar = document.getElementById("galleryAdminBar");
    if (adminBar) {
      const user = currentUser();
      adminBar.classList.toggle("u-hidden", !user || !user.isAdmin);
    }
    renderGallery();
  }
}

export const { mount, unmount, capabilities } = fromSection(new GallerySection("gallery"));

/**
 * Handle file input change — upload images from device.
 * Reads each file as a data-URL (local fallback), then attempts to upload
 * to Supabase Storage (bucket "wedding-photos"). On success the public URL
 * replaces the data-URL so localStorage is not bloated. S417.
 * @param {HTMLInputElement} input
 */
export function handleGalleryUpload(input) {
  const files = Array.from(input.files ?? []);
  files.forEach((file) => {
    if (!file.type.startsWith("image/")) return;
    const caption = file.name.replace(/\.[^.]+$/, "");
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = /** @type {string} */ (e.target?.result);
      if (!dataUrl) return;
      // Add to store immediately with data-URL (optimistic / offline-first)
      addGalleryPhoto({ url: dataUrl, caption });
      // S417: attempt Supabase Storage upload in the background
      _uploadToSupabase(file, caption, dataUrl);
    };
    reader.readAsDataURL(file);
  });
  // Reset so the same file can be re-selected
  input.value = "";
}

/**
 * Upload a photo file to Supabase Storage and replace the stored data-URL
 * with the resulting public URL if the upload succeeds.
 * Silently falls back to the data-URL if Supabase is unavailable.
 * @param {File} file
 * @param {string} caption
 * @param {string} dataUrl  The locally-stored fallback URL (to find the entry)
 */
async function _uploadToSupabase(file, caption, dataUrl) {
  const supabase = getSupabaseClient();
  if (!supabase) return; // Supabase not configured — stay with data-URL
  try {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `wedding-photos/${uid()}.${ext}`;
    const { error } = await supabase.storage.from("wedding-photos").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      showToast(t("gallery_upload_supabase_error"), "error");
      return;
    }
    const { data: publicData } = supabase.storage.from("wedding-photos").getPublicUrl(path);
    const publicUrl = publicData?.publicUrl;
    if (!publicUrl) {
      showToast(t("gallery_upload_supabase_error"), "error");
      return;
    }
    // Replace the data-URL entry with the public URL
    const gallery = /** @type {any[]} */ (storeGet("gallery") ?? []);
    const idx = gallery.findIndex((p) => p.url === dataUrl && p.caption === caption);
    if (idx !== -1) {
      gallery[idx] = { ...gallery[idx], url: publicUrl, storagePath: path };
      storeSet("gallery", gallery);
      enqueueWrite("gallery", () => syncStoreKeyToSheets("gallery"));
    }
    showToast(t("gallery_upload_supabase_done"), "success");
    vibrate(HAPTIC.SUCCESS);
  } catch {
    showToast(t("gallery_upload_supabase_error"), "error");
  }
}

/**
 * Add a photo to the gallery.
 * @param {{ url: string, caption?: string, credit?: string }} photo
 */
function addGalleryPhoto(photo) {
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
    img.src = buildCdnImageUrl(photo.url, { width: 1200, format: "auto", quality: 85 }, CDN_IMAGE_HOST);
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

function renderGallery() {
  const grid = el.galleryGrid;
  if (!grid) return;

  const photos = /** @type {any[]} */ (storeGet("gallery") ?? []);
  const user = currentUser();
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
      img.src = buildCdnImageUrl(p.url, { width: 400, format: "auto", quality: 80 }, CDN_IMAGE_HOST);
      const srcset = buildSrcset(p.url, [320, 480, 640], { format: "auto", quality: 80 }, CDN_IMAGE_HOST);
      if (srcset) {
        img.srcset = srcset;
        img.sizes = defaultSizes();
      }
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
