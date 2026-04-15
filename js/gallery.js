// @ts-check
"use strict";

/* ── Photo Gallery (v1.16.0) ─────────────────────────────────────────────────
   Admin uploads event photos (compressed to ≤400px, stored as data URLs).
   All users (guests + admins) can view the gallery.
   Data stored as wedding_v1_gallery in localStorage.
   window._gallery = [{id, dataUrl, caption, createdAt}]
   ─────────────────────────────────────────────────────────────────────────── */

/** Max dimension when resizing uploaded images */
const GALLERY_MAX_PX = 480;
/** JPEG quality for compression */
const GALLERY_QUALITY = 0.82;

/** Render the photo gallery section */
function renderGallery() {
  const grid = document.getElementById("galleryGrid");
  const empty = document.getElementById("galleryEmpty");
  const adminBar = document.getElementById("galleryAdminBar");

  if (!grid) return;

  const isAdmin = window._authUser && window._authUser.isAdmin;
  if (adminBar) adminBar.style.display = isAdmin ? "" : "none";

  if (!window._gallery || !window._gallery.length) {
    grid.replaceChildren();
    if (empty) empty.style.display = "";
    return;
  }

  if (empty) empty.style.display = "none";
  grid.replaceChildren();

  window._gallery
    .slice()
    .reverse()
    .forEach(function (photo) {
      const figure = document.createElement("figure");
      figure.className = "gallery-item";

      const img = document.createElement("img");
      img.src = photo.dataUrl;
      img.alt = photo.caption || window.t("gallery_photo_alt");
      img.loading = "lazy";
      img.decoding = "async";
      img.className = "gallery-img";
      img.width = GALLERY_MAX_PX;
      img.height = GALLERY_MAX_PX;
      img.onclick = function () {
        _openGalleryLightbox(photo);
      };

      figure.appendChild(img);

      if (photo.caption) {
        const cap = document.createElement("figcaption");
        cap.className = "gallery-caption";
        cap.textContent = photo.caption;
        figure.appendChild(cap);
      }

      if (isAdmin) {
        const del = document.createElement("button");
        del.className = "gallery-delete-btn";
        del.textContent = "✕";
        del.setAttribute("aria-label", window.t("gallery_delete"));
        del.setAttribute("onclick", `deleteGalleryPhoto("${photo.id}")`);
        figure.appendChild(del);
      }

      grid.appendChild(figure);
    });
}

/** Trigger hidden file input for gallery upload */
function openGalleryUpload() {
  const inp = document.getElementById("galleryFileInput");
  if (inp) inp.click();
}

/** Handle file selection — compress and store each image */
function handleGalleryUpload(e) {
  const input = e && e.target ? e.target : e;
  if (!input || !input.files || !input.files.length) return;
  const files = Array.prototype.slice.call(input.files);
  let processed = 0;

  files.slice(0, 20).forEach(function (file) {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      _compressGalleryImage(e.target.result, function (dataUrl) {
        window._gallery.push({
          id: window.uid(),
          dataUrl,
          caption: "",
          createdAt: new Date().toISOString(),
        });
        processed++;
        if (processed === files.length || processed >= 20) {
          window.saveAll();
          renderGallery();
          window.showToast(window.t("gallery_uploaded"), "success");
        }
      });
    };
    reader.readAsDataURL(file);
  });

  input.value = "";
}

/** Delete a photo from the gallery by id */
function deleteGalleryPhoto(id) {
  window._gallery = window._gallery.filter(function (p) {
    return p.id !== id;
  });
  window.saveAll();
  _closeGalleryLightbox();
  renderGallery();
  window.showToast(window.t("gallery_deleted"), "success");
}

/** Compress an image data URL to max dimensions, returning compressed data URL */
function _compressGalleryImage(src, callback) {
  const img = new window.Image();
  img.onload = function () {
    let w = img.width;
    let h = img.height;
    const max = GALLERY_MAX_PX;
    if (w > max || h > max) {
      if (w >= h) {
        h = Math.round((h * max) / w);
        w = max;
      } else {
        w = Math.round((w * max) / h);
        h = max;
      }
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    callback(canvas.toDataURL("image/jpeg", GALLERY_QUALITY));
  };
  img.src = src;
}

/* ── Lightbox ── */

let _galleryLightboxPhoto = null;

function _openGalleryLightbox(photo) {
  _galleryLightboxPhoto = photo;
  const overlay = document.getElementById("galleryLightbox");
  const imgEl = document.getElementById("galleryLightboxImg");
  const capEl = document.getElementById("galleryLightboxCaption");
  if (!overlay || !imgEl) return;
  imgEl.src = photo.dataUrl;
  imgEl.alt = photo.caption || "";
  if (capEl) capEl.textContent = photo.caption || "";
  overlay.classList.add("active");
  overlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function _closeGalleryLightbox() {
  const overlay = document.getElementById("galleryLightbox");
  if (overlay) {
    overlay.classList.remove("active");
    overlay.setAttribute("aria-hidden", "true");
  }
  document.body.style.overflow = "";
  _galleryLightboxPhoto = null;
}

function closeGalleryLightbox() {
  _closeGalleryLightbox();
}
