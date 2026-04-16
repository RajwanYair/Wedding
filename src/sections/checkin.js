/**
 * src/sections/checkin.js — Day-of check-in section ESM module (S0.8)
 *
 * Search guests and mark them as checked-in (arrived).
 */

import { storeGet, storeSet, storeSubscribe } from "../core/store.js";
import { el } from "../core/dom.js";
import { t } from "../core/i18n.js";
import { enqueueWrite, syncStoreKeyToSheets } from "../services/sheets.js";
import { announce } from "../core/ui.js";

/** @type {(() => void)[]} */
const _unsubs = [];

/** @type {string} */
let _searchQuery = "";

/** @type {boolean} */
let _giftMode = false;

/** @type {MediaStream|null} */
let _cameraStream = null;

/** @type {number|null} */
let _scanIntervalId = null;

export function mount(_container) {
  _unsubs.push(storeSubscribe("guests", renderCheckin));
  renderCheckin();
}

export function unmount() {
  _unsubs.forEach((fn) => fn());
  _unsubs.length = 0;
  _giftMode = false;
  stopQrScan();
}

/**
 * @param {string} query
 */
export function setCheckinSearch(query) {
  _searchQuery = query.toLowerCase();
  renderCheckin();
}

/**
 * Mark a guest as checked-in (present).
 * @param {string} guestId
 */
export function checkInGuest(guestId) {
  const guests = [.../** @type {any[]} */ (storeGet("guests") ?? [])];
  const idx = guests.findIndex((g) => g.id === guestId);
  if (idx !== -1) {
    // S11.5 Capture gift amount if visible
    let giftVal = guests[idx].gift;
    if (_giftMode) {
      const giftInput = /** @type {HTMLInputElement|null} */ (
        document.querySelector(`.gift-input[data-guest-id="${guestId}"]`)
      );
      if (giftInput && giftInput.value) {
        giftVal = Number(giftInput.value) || 0;
      }
    }
    guests[idx] = {
      ...guests[idx],
      checkedIn: true,
      checkedInAt: new Date().toISOString(),
      gift: giftVal,
    };
    storeSet("guests", guests);
    enqueueWrite("guests", () => syncStoreKeyToSheets("guests"));
    // S16.1 — Sound + visual alert on check-in
    _playCheckinSound();
    _flashCheckinAlert(guests[idx]);
  }
}

export function renderCheckin() {
  const list = el.checkinList;
  if (!list) return;

  const allGuests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const tables = /** @type {any[]} */ (storeGet("tables") ?? []);
  let guests = allGuests.filter((g) => g.status === "confirmed");

  if (_searchQuery) {
    guests = guests.filter(
      (g) =>
        `${g.firstName} ${g.lastName || ""}`
          .toLowerCase()
          .includes(_searchQuery) || (g.phone || "").includes(_searchQuery),
    );
  }

  list.textContent = "";
  guests.forEach((g) => {
    const tr = document.createElement("tr");
    tr.className = `checkin-row${g.checkedIn ? " checkin-row--done" : ""}`;
    tr.dataset.id = g.id;

    const nameTd = document.createElement("td");
    nameTd.textContent = `${g.firstName} ${g.lastName || ""}`;
    tr.appendChild(nameTd);

    const phoneTd = document.createElement("td");
    phoneTd.textContent = g.phone || "";
    tr.appendChild(phoneTd);

    const countTd = document.createElement("td");
    countTd.textContent = String((g.count || 1) + (g.children || 0));
    tr.appendChild(countTd);

    const tableTd = document.createElement("td");
    const guestTable = tables.find((tb) => tb.id === g.tableId);
    tableTd.textContent = guestTable
      ? guestTable.name
      : g.tableId
        ? g.tableId
        : "—";
    tr.appendChild(tableTd);

    // S11.5 Gift column
    const giftTd = document.createElement("td");
    giftTd.className = `gift-col${  _giftMode ? "" : " u-hidden"}`;
    if (g.checkedIn) {
      giftTd.textContent = g.gift ? `₪${g.gift}` : "—";
    } else {
      const giftInput = document.createElement("input");
      giftInput.type = "number";
      giftInput.min = "0";
      giftInput.className = "gift-input";
      giftInput.style.width = "5rem";
      giftInput.placeholder = "₪";
      giftInput.dataset.guestId = g.id;
      giftTd.appendChild(giftInput);
    }
    tr.appendChild(giftTd);

    const actionTd = document.createElement("td");
    if (!g.checkedIn) {
      const btn = document.createElement("button");
      btn.className = "btn btn-small btn-success";
      btn.textContent = t("checkin_arrive_btn");
      btn.dataset.action = "checkInGuest";
      btn.dataset.actionArg = g.id;
      actionTd.appendChild(btn);
    } else {
      const badge = document.createElement("span");
      badge.className = "badge badge--success";
      badge.textContent = t("checkin_marked_arrived");
      actionTd.appendChild(badge);
    }
    tr.appendChild(actionTd);

    list.appendChild(tr);
  });

  // Update all stats
  const confirmed = allGuests.filter((g) => g.status === "confirmed").length;
  const arrived = allGuests.filter((g) => g.checkedIn).length;
  const pct = confirmed > 0 ? Math.round((arrived / confirmed) * 100) : 0;

  const totalEl = document.getElementById("checkinTotal");
  if (totalEl) totalEl.textContent = String(allGuests.length);

  const arrivedEl = document.getElementById("checkinArrived");
  if (arrivedEl) arrivedEl.textContent = String(arrived);

  const confirmedEl = document.getElementById("checkinConfirmed");
  if (confirmedEl) confirmedEl.textContent = String(confirmed);

  const pctEl = document.getElementById("checkinPct");
  if (pctEl) pctEl.textContent = `${pct}%`;

  const progressBar = /** @type {HTMLElement|null} */ (
    document.getElementById("checkinProgressBar")
  );
  if (progressBar) progressBar.style.width = `${pct}%`;

  // S11.5 Gift total
  const giftTotal = allGuests
    .filter((g) => g.checkedIn && g.gift)
    .reduce((s, g) => s + (Number(g.gift) || 0), 0);
  const giftTotalEl = document.getElementById("checkinGiftTotal");
  if (giftTotalEl) giftTotalEl.textContent = `₪${giftTotal.toLocaleString()}`;
}

/**
 * Export check-in report as CSV (name, status, time).
 */
export function exportCheckinReport() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []).filter(
    (g) => g.status === "confirmed",
  );
  const header = "Name,Phone,Count,CheckedIn,CheckedInAt";
  const rows = guests.map((g) =>
    [
      `"${g.firstName} ${g.lastName || ""}"`,
      `"${g.phone || ""}"`,
      (g.count || 1) + (g.children || 0),
      g.checkedIn ? "yes" : "no",
      `"${g.checkedInAt || ""}"`,
    ].join(","),
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "checkin-report.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Reset all check-in flags (un-arrive everyone).
 */
export function resetAllCheckins() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []).map((g) => ({
    ...g,
    checkedIn: false,
    checkedInAt: undefined,
  }));
  storeSet("guests", guests);
  enqueueWrite("guests", () => syncStoreKeyToSheets("guests"));
}

/**
 * Aggregate check-in statistics.
 * @returns {{ total: number, checkedIn: number, checkinRate: number, remaining: number }}
 */
export function getCheckinStats() {
  const guests = /** @type {any[]} */ (storeGet("guests") ?? []);
  const confirmed = guests.filter((g) => g.status === "confirmed");
  const total = confirmed.reduce((s, g) => s + (g.count || 1), 0);
  const checkedIn = confirmed
    .filter((g) => g.checkedIn)
    .reduce((s, g) => s + (g.count || 1), 0);
  return {
    total,
    checkedIn,
    checkinRate: total > 0 ? Math.round((checkedIn / total) * 100) : 0,
    remaining: total - checkedIn,
  };
}

// ── S11.5 Gift Mode ───────────────────────────────────────────────────────

/**
 * Toggle gift mode — shows/hides gift column in check-in table.
 */
export function toggleGiftMode() {
  _giftMode = !_giftMode;
  document.querySelectorAll(".gift-col").forEach((el) => {
    el.classList.toggle("u-hidden", !_giftMode);
  });
}

/**
 * Record a gift for a specific guest.
 * @param {string} guestId
 * @param {number} amount
 */
export function recordGift(guestId, amount) {
  const guests = [.../** @type {any[]} */ (storeGet("guests") ?? [])];
  const idx = guests.findIndex((g) => g.id === guestId);
  if (idx !== -1) {
    guests[idx] = { ...guests[idx], gift: amount, updatedAt: new Date().toISOString() };
    storeSet("guests", guests);
    enqueueWrite("guests", () => syncStoreKeyToSheets("guests"));
  }
}

// ── S12.3 QR Code Check-in ────────────────────────────────────────────────

/**
 * Start QR scanner using BarcodeDetector API + camera.
 */
export async function startQrScan() {
  const box = document.getElementById("qrScannerBox");
  const video = /** @type {HTMLVideoElement|null} */ (document.getElementById("qrVideo"));
  if (!box || !video) return;

  // Check BarcodeDetector support
  if (!("BarcodeDetector" in window)) {
    announce(t("qr_not_supported") || "QR scanning not supported in this browser");
    return;
  }

  try {
    _cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    video.srcObject = _cameraStream;
    box.classList.remove("u-hidden");

    const detector = new /** @type {any} */ (window).BarcodeDetector({
      formats: ["qr_code"],
    });

    _scanIntervalId = window.setInterval(async () => {
      if (video.readyState < 2) return;
      try {
        const barcodes = await detector.detect(video);
        if (barcodes.length > 0) {
          const raw = barcodes[0].rawValue || "";
          // QR contains guestId
          const guestId = raw.includes("guestId=")
            ? new URL(raw).searchParams.get("guestId")
            : raw;
          if (guestId) {
            checkInGuest(guestId);
            announce(t("checkin_qr_success") || "Guest checked in via QR");
            stopQrScan();
          }
        }
      } catch {
        // detection error — keep scanning
      }
    }, 500);
  } catch {
    announce(t("qr_camera_error") || "Camera access denied");
  }
}

/**
 * Stop QR scanner and release camera.
 */
export function stopQrScan() {
  if (_scanIntervalId !== null) {
    clearInterval(_scanIntervalId);
    _scanIntervalId = null;
  }
  if (_cameraStream) {
    _cameraStream.getTracks().forEach((t) => t.stop());
    _cameraStream = null;
  }
  const box = document.getElementById("qrScannerBox");
  if (box) box.classList.add("u-hidden");
}

/**
 * Generate a QR code URL for a guest (using QR API).
 * @param {string} guestId
 * @returns {string} QR code image URL
 */
export function getGuestQrUrl(guestId) {
  const baseUrl = window.location.origin + window.location.pathname;
  const checkinUrl = `${baseUrl}?guestId=${encodeURIComponent(guestId)}&action=checkin`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(checkinUrl)}`;
}

// ── S16.1 Check-in Sound & Visual Alerts ─────────────────────────────────

/** @type {AudioContext|null} */
let _audioCtx = null;

/**
 * Play a short pleasant confirmation beep using Web Audio API.
 */
function _playCheckinSound() {
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = _audioCtx.createOscillator();
    const gain = _audioCtx.createGain();
    osc.connect(gain);
    gain.connect(_audioCtx.destination);
    osc.frequency.value = 800;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.3, _audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, _audioCtx.currentTime + 0.3);
    osc.start(_audioCtx.currentTime);
    osc.stop(_audioCtx.currentTime + 0.3);
  } catch {
    // Audio not available — silently skip
  }
}

/**
 * Flash a visual alert banner for the checked-in guest.
 * @param {Record<string,unknown>} guest
 */
function _flashCheckinAlert(guest) {
  const banner = document.createElement("div");
  banner.className = "checkin-flash";
  banner.textContent = `✅ ${guest.firstName} ${guest.lastName || ""} ${t("checkin_arrived")}`;
  const anchor = document.getElementById("checkinList") ?? document.body;
  anchor.parentElement?.insertBefore(banner, anchor);
  setTimeout(() => banner.remove(), 3000);
}
