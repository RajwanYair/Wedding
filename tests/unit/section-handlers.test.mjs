/**
 * tests/unit/section-handlers.test.mjs — S330: coverage for src/handlers/section-handlers.js
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Capture registered handlers ──────────────────────────────────────────

/** @type {Map<string, Function>} */
const _handlers = new Map();

vi.mock("../../src/core/events.js", () => ({
  on: vi.fn((action, fn) => _handlers.set(action, fn)),
}));

// ── Mock all dependencies ─────────────────────────────────────────────────

const _toastCalls = [];
const _confirmCallbacks = [];
const _openModalMock = vi.fn();
const _closeModalMock = vi.fn();

vi.mock("../../src/core/ui.js", () => ({
  showToast: vi.fn((msg, type) => _toastCalls.push({ msg, type })),
  openModal: (...a) => _openModalMock(...a),
  closeModal: (...a) => _closeModalMock(...a),
  showConfirmDialog: vi.fn((_msg, cb) => _confirmCallbacks.push(cb)),
}));

vi.mock("../../src/core/i18n.js", () => ({
  t: (k, _opts) => k,
}));

const _submitRsvpMock = vi.fn(() => ({ ok: true }));
const _lookupRsvpMock = vi.fn(() => ({ found: false }));

vi.mock("../../src/sections/rsvp.js", () => ({
  submitRsvp: (...a) => _submitRsvpMock(...a),
  lookupRsvpByPhone: (...a) => _lookupRsvpMock(...a),
}));

const _handleGalleryUploadMock = vi.fn();
const _deleteGalleryPhotoMock = vi.fn();
const _openLightboxMock = vi.fn();

vi.mock("../../src/sections/gallery.js", () => ({
  handleGalleryUpload: (...a) => _handleGalleryUploadMock(...a),
  deleteGalleryPhoto: (...a) => _deleteGalleryPhotoMock(...a),
  openLightbox: (...a) => _openLightboxMock(...a),
}));

const _sendWhatsAppAllMock = vi.fn();
const _sendWhatsAppAllViaApiMock = vi.fn();
const _checkGreenApiMock = vi.fn();
const _saveGreenApiConfigMock = vi.fn();
const _updateWaPreviewMock = vi.fn();
const _sendWhatsAppReminderMock = vi.fn();

vi.mock("../../src/sections/whatsapp.js", () => ({
  sendWhatsAppAll: (...a) => _sendWhatsAppAllMock(...a),
  sendWhatsAppAllViaApi: (...a) => _sendWhatsAppAllViaApiMock(...a),
  checkGreenApiConnection: () => _checkGreenApiMock(),
  saveGreenApiConfig: (...a) => _saveGreenApiConfigMock(...a),
  updateWaPreview: (...a) => _updateWaPreviewMock(...a),
  sendWhatsAppReminder: () => _sendWhatsAppReminderMock(),
}));

const _saveTimelineItemMock = vi.fn(() => ({ ok: true }));
const _deleteTimelineItemMock = vi.fn();
const _openTimelineForEditMock = vi.fn();
const _printTimelineMock = vi.fn();
const _toggleTimelineDoneMock = vi.fn();

vi.mock("../../src/sections/timeline.js", () => ({
  saveTimelineItem: (...a) => _saveTimelineItemMock(...a),
  deleteTimelineItem: (...a) => _deleteTimelineItemMock(...a),
  openTimelineForEdit: (...a) => _openTimelineForEditMock(...a),
  printTimeline: () => _printTimelineMock(),
  toggleTimelineDone: (...a) => _toggleTimelineDoneMock(...a),
}));

const _setExpenseCategoryFilterMock = vi.fn();

vi.mock("../../src/sections/expenses.js", () => ({
  setExpenseCategoryFilter: (...a) => _setExpenseCategoryFilterMock(...a),
}));

const _updateWeddingDetailsMock = vi.fn();
const _handleInvitationUploadMock = vi.fn();

vi.mock("../../src/sections/invitation.js", () => ({
  updateWeddingDetails: (...a) => _updateWeddingDetailsMock(...a),
  handleInvitationUpload: (...a) => _handleInvitationUploadMock(...a),
}));

const _submitContactFormMock = vi.fn(() => ({ ok: true }));
const _exportContactsCSVMock = vi.fn();

vi.mock("../../src/sections/contact-collector.js", () => ({
  submitContactForm: (...a) => _submitContactFormMock(...a),
  exportContactsCSV: () => _exportContactsCSVMock(),
}));

const _showTableFinderMock = vi.fn();

vi.mock("../../src/sections/landing.js", () => ({
  showTableFinder: (...a) => _showTableFinderMock(...a),
}));

const _toggleWorkspaceDropdownMock = vi.fn();
const _selectWorkspaceMock = vi.fn();

vi.mock("../../src/sections/workspace-switcher.js", () => ({
  toggleWorkspaceDropdown: () => _toggleWorkspaceDropdownMock(),
  selectWorkspace: (...a) => _selectWorkspaceMock(...a),
}));

const _toggleNotifPanelMock = vi.fn();
const _markAllNotifReadMock = vi.fn();

vi.mock("../../src/sections/notification-panel.js", () => ({
  toggleNotifPanel: () => _toggleNotifPanelMock(),
  markAllNotifRead: () => _markAllNotifReadMock(),
}));

const _rosAddItemMock = vi.fn();
const _rosResetDefaultMock = vi.fn();

vi.mock("../../src/sections/run-of-show.js", () => ({
  addItem: () => _rosAddItemMock(),
  resetDefault: () => _rosResetDefaultMock(),
}));

const _buildPreviewHtmlMock = vi.fn(() => "<p>preview</p>");
const _executePrintMock = vi.fn();

vi.mock("../../src/services/export.js", () => ({
  buildPreviewHtml: (...a) => _buildPreviewHtmlMock(...a),
  executePrint: (...a) => _executePrintMock(...a),
}));

// ── Import after mocks ────────────────────────────────────────────────────

import { register } from "../../src/handlers/section-handlers.js";

// ── Helpers ───────────────────────────────────────────────────────────────

function dispatch(action, dataset = {}, eventTarget = null) {
  const fn = _handlers.get(action);
  if (!fn) throw new Error(`Handler not registered: ${action}`);
  const el = document.createElement("button");
  for (const [k, v] of Object.entries(dataset)) el.dataset[k] = v;
  const evt = new MouseEvent("click");
  if (eventTarget !== undefined && eventTarget !== null)
    Object.defineProperty(evt, "target", { value: eventTarget });
  return fn(el, evt);
}

function addInput(id, value, tag = "input") {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement(tag);
    el.id = id;
    document.body.appendChild(el);
  }
  el.value = value;
  return el;
}

// ── Setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  _handlers.clear();
  _toastCalls.length = 0;
  _confirmCallbacks.length = 0;
  vi.clearAllMocks();
  _submitRsvpMock.mockReturnValue({ ok: true });
  _saveTimelineItemMock.mockReturnValue({ ok: true });
  _submitContactFormMock.mockReturnValue({ ok: true });
  _lookupRsvpMock.mockReturnValue({ found: false });
  _buildPreviewHtmlMock.mockReturnValue("<p>preview</p>");
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("S330 — sectionHandlers — register()", () => {
  it("registers all expected action handlers", () => {
    register();
    const expected = [
      "submitRSVP", "lookupRsvpByPhone",
      "handleGalleryUpload", "deleteGalleryPhoto", "openLightbox", "closeGalleryLightbox",
      "sendWhatsAppAll", "sendWhatsAppAllViaApi", "updateWaPreview",
      "checkGreenApiConnection", "sendWhatsAppReminder", "saveGreenApiConfig",
      "saveTimelineItem", "deleteTimelineItem", "openEditTimelineModal",
      "printTimeline", "toggleTimelineDone", "setExpenseCategoryFilter",
      "updateWeddingDetails", "handleInvitationUpload",
      "submitContactForm", "exportContactsCSV",
      "findTable",
      "toggleWorkspaceDropdown", "selectWorkspace",
      "toggleNotifPanel", "markAllNotifRead",
      "rosAddItem", "rosResetDefault",
      "openPrintPreview", "previewPrintSection", "executePrint",
    ];
    for (const action of expected) {
      expect(_handlers.has(action), `missing: ${action}`).toBe(true);
    }
  });

  // ── RSVP ──

  it("submitRSVP calls submitRsvp and does not toast on success", () => {
    register();
    const evt = new Event("submit");
    Object.defineProperty(evt, "preventDefault", { value: vi.fn() });
    const fn = _handlers.get("submitRSVP");
    fn(document.createElement("form"), evt);
    expect(_submitRsvpMock).toHaveBeenCalledTimes(1);
    expect(_toastCalls).toHaveLength(0);
  });

  it("submitRSVP toasts error when submitRsvp returns errors", () => {
    register();
    _submitRsvpMock.mockReturnValue({ ok: false, errors: ["Phone required"] });
    const evt = new Event("submit");
    Object.defineProperty(evt, "preventDefault", { value: vi.fn() });
    const fn = _handlers.get("submitRSVP");
    fn(document.createElement("form"), evt);
    expect(_toastCalls[0]?.type).toBe("error");
    expect(_toastCalls[0]?.msg).toBe("Phone required");
  });

  it("submitRSVP uses generic error key when no errors array", () => {
    register();
    _submitRsvpMock.mockReturnValue({ ok: false });
    const evt = new Event("submit");
    Object.defineProperty(evt, "preventDefault", { value: vi.fn() });
    const fn = _handlers.get("submitRSVP");
    fn(document.createElement("form"), evt);
    expect(_toastCalls[0]?.msg).toBe("error_save");
  });

  it("lookupRsvpByPhone updates status element on found=true", () => {
    register();
    _lookupRsvpMock.mockReturnValue({ found: true });
    const statusEl = document.createElement("div");
    statusEl.id = "rsvpLookupStatus";
    statusEl.classList.add("u-hidden");
    document.body.appendChild(statusEl);
    const input = document.createElement("input");
    input.value = "0541234567";
    dispatch("lookupRsvpByPhone", {}, input);
    expect(statusEl.classList.contains("u-hidden")).toBe(false);
    expect(statusEl.textContent).toBe("rsvp_lookup_found");
    document.body.removeChild(statusEl);
  });

  it("lookupRsvpByPhone shows rsvpDetails on not found with 9+ digit phone", () => {
    register();
    _lookupRsvpMock.mockReturnValue({ found: false });
    const details = document.createElement("div");
    details.id = "rsvpDetails";
    details.classList.add("u-hidden");
    document.body.appendChild(details);
    const input = document.createElement("input");
    input.value = "0541234567";
    dispatch("lookupRsvpByPhone", {}, input);
    expect(details.classList.contains("u-hidden")).toBe(false);
    document.body.removeChild(details);
  });

  it("lookupRsvpByPhone does nothing when event target is not input", () => {
    register();
    dispatch("lookupRsvpByPhone", {}, null);
    expect(_lookupRsvpMock).not.toHaveBeenCalled();
  });

  // ── Gallery ──

  it("handleGalleryUpload calls handleGalleryUpload with element", () => {
    register();
    const fn = _handlers.get("handleGalleryUpload");
    const el = document.createElement("input");
    fn(el);
    expect(_handleGalleryUploadMock).toHaveBeenCalledWith(el);
  });

  it("deleteGalleryPhoto shows confirm then calls deleteGalleryPhoto", () => {
    register();
    dispatch("deleteGalleryPhoto", { actionArg: "photo-1" });
    expect(_confirmCallbacks.length).toBe(1);
    _confirmCallbacks[0]();
    expect(_deleteGalleryPhotoMock).toHaveBeenCalledWith("photo-1");
  });

  it("openLightbox calls openLightbox with actionArg", () => {
    register();
    dispatch("openLightbox", { actionArg: "img-5" });
    expect(_openLightboxMock).toHaveBeenCalledWith("img-5");
  });

  it("closeGalleryLightbox closes galleryLightbox modal", () => {
    register();
    dispatch("closeGalleryLightbox");
    expect(_closeModalMock).toHaveBeenCalledWith("galleryLightbox");
  });

  // ── WhatsApp ──

  it("sendWhatsAppAll calls sendWhatsAppAll with actionArg", () => {
    register();
    dispatch("sendWhatsAppAll", { actionArg: "pending" });
    expect(_sendWhatsAppAllMock).toHaveBeenCalledWith("pending");
  });

  it("sendWhatsAppAll defaults to 'all' when no actionArg", () => {
    register();
    dispatch("sendWhatsAppAll", {});
    expect(_sendWhatsAppAllMock).toHaveBeenCalledWith("all");
  });

  it("sendWhatsAppAllViaApi calls sendWhatsAppAllViaApi with actionArg", () => {
    register();
    dispatch("sendWhatsAppAllViaApi", { actionArg: "confirmed" });
    expect(_sendWhatsAppAllViaApiMock).toHaveBeenCalledWith("confirmed");
  });

  it("updateWaPreview calls updateWaPreview with textarea value", () => {
    register();
    const ta = document.createElement("textarea");
    ta.value = "Hello {name}!";
    dispatch("updateWaPreview", {}, ta);
    expect(_updateWaPreviewMock).toHaveBeenCalledWith("Hello {name}!");
  });

  it("updateWaPreview passes empty string when target is not textarea", () => {
    register();
    dispatch("updateWaPreview", {}, null);
    expect(_updateWaPreviewMock).toHaveBeenCalledWith("");
  });

  it("checkGreenApiConnection calls checkGreenApiConnection", () => {
    register();
    dispatch("checkGreenApiConnection");
    expect(_checkGreenApiMock).toHaveBeenCalledTimes(1);
  });

  it("sendWhatsAppReminder calls sendWhatsAppReminder", () => {
    register();
    dispatch("sendWhatsAppReminder");
    expect(_sendWhatsAppReminderMock).toHaveBeenCalledTimes(1);
  });

  it("saveGreenApiConfig calls saveGreenApiConfig and toasts", () => {
    register();
    const form = document.createElement("form");
    document.body.appendChild(form);
    const btn = document.createElement("button");
    form.appendChild(btn);
    const evt = new MouseEvent("click");
    Object.defineProperty(evt, "target", { value: btn });
    const fn = _handlers.get("saveGreenApiConfig");
    fn(document.createElement("button"), evt);
    expect(_saveGreenApiConfigMock).toHaveBeenCalled();
    expect(_toastCalls[0]?.type).toBe("success");
    document.body.removeChild(form);
  });

  // ── Timeline ──

  it("saveTimelineItem calls saveTimelineItem and closes modal on success", () => {
    register();
    dispatch("saveTimelineItem");
    expect(_saveTimelineItemMock).toHaveBeenCalledTimes(1);
    expect(_closeModalMock).toHaveBeenCalledWith("timelineModal");
    expect(_toastCalls[0]?.type).toBe("success");
  });

  it("saveTimelineItem toasts error on failure", () => {
    register();
    _saveTimelineItemMock.mockReturnValue({ ok: false, errors: ["Time required"] });
    dispatch("saveTimelineItem");
    expect(_toastCalls[0]?.type).toBe("error");
    expect(_toastCalls[0]?.msg).toBe("Time required");
  });

  it("deleteTimelineItem shows confirm then deletes", () => {
    register();
    dispatch("deleteTimelineItem", { actionArg: "tl-1" });
    expect(_confirmCallbacks.length).toBe(1);
    _confirmCallbacks[0]();
    expect(_deleteTimelineItemMock).toHaveBeenCalledWith("tl-1");
  });

  it("openEditTimelineModal calls openTimelineForEdit and openModal", () => {
    register();
    dispatch("openEditTimelineModal", { actionArg: "tl-2" });
    expect(_openTimelineForEditMock).toHaveBeenCalledWith("tl-2");
    expect(_openModalMock).toHaveBeenCalledWith("timelineModal");
  });

  it("printTimeline calls printTimeline", () => {
    register();
    dispatch("printTimeline");
    expect(_printTimelineMock).toHaveBeenCalledTimes(1);
  });

  it("toggleTimelineDone calls toggleTimelineDone with actionArg", () => {
    register();
    dispatch("toggleTimelineDone", { actionArg: "tl-3" });
    expect(_toggleTimelineDoneMock).toHaveBeenCalledWith("tl-3");
  });

  it("setExpenseCategoryFilter delegates with actionArg", () => {
    register();
    dispatch("setExpenseCategoryFilter", { actionArg: "catering" });
    expect(_setExpenseCategoryFilterMock).toHaveBeenCalledWith("catering");
  });

  // ── Invitation ──

  it("updateWeddingDetails calls updateWeddingDetails", () => {
    register();
    dispatch("updateWeddingDetails");
    expect(_updateWeddingDetailsMock).toHaveBeenCalledTimes(1);
  });

  it("handleInvitationUpload calls handleInvitationUpload with input", () => {
    register();
    const input = document.createElement("input");
    input.type = "file";
    dispatch("handleInvitationUpload", {}, input);
    expect(_handleInvitationUploadMock).toHaveBeenCalledWith(input);
  });

  it("handleInvitationUpload does nothing when target is not input", () => {
    register();
    dispatch("handleInvitationUpload", {}, null);
    expect(_handleInvitationUploadMock).not.toHaveBeenCalled();
  });

  // ── Contact form ──

  it("submitContactForm toasts success when ok=true", () => {
    register();
    dispatch("submitContactForm");
    expect(_submitContactFormMock).toHaveBeenCalledTimes(1);
    expect(_toastCalls[0]?.type).toBe("success");
  });

  it("submitContactForm toasts error on failure", () => {
    register();
    _submitContactFormMock.mockReturnValue({ ok: false, errors: ["Phone invalid"] });
    dispatch("submitContactForm");
    expect(_toastCalls[0]?.type).toBe("error");
  });

  it("exportContactsCSV calls exportContactsCSV", () => {
    register();
    dispatch("exportContactsCSV");
    expect(_exportContactsCSVMock).toHaveBeenCalledTimes(1);
  });

  // ── Landing table finder ──

  it("findTable calls showTableFinder with input value", () => {
    register();
    addInput("tablefinderInput", "Cohen");
    dispatch("findTable");
    expect(_showTableFinderMock).toHaveBeenCalledWith("Cohen");
  });

  it("findTable falls back to findTableInput element", () => {
    register();
    const t1 = document.getElementById("tablefinderInput");
    if (t1) t1.remove();
    addInput("findTableInput", "Levi");
    dispatch("findTable");
    expect(_showTableFinderMock).toHaveBeenCalledWith("Levi");
  });

  // ── Workspace / Notifications ──

  it("toggleWorkspaceDropdown calls toggleWorkspaceDropdown", () => {
    register();
    dispatch("toggleWorkspaceDropdown");
    expect(_toggleWorkspaceDropdownMock).toHaveBeenCalledTimes(1);
  });

  it("selectWorkspace calls selectWorkspace with actionArg", () => {
    register();
    const fn = _handlers.get("selectWorkspace");
    const el = document.createElement("button");
    el.setAttribute("data-action-arg", "ws-2");
    fn(el);
    expect(_selectWorkspaceMock).toHaveBeenCalledWith("ws-2");
  });

  it("toggleNotifPanel calls toggleNotifPanel", () => {
    register();
    dispatch("toggleNotifPanel");
    expect(_toggleNotifPanelMock).toHaveBeenCalledTimes(1);
  });

  it("markAllNotifRead calls markAllNotifRead", () => {
    register();
    dispatch("markAllNotifRead");
    expect(_markAllNotifReadMock).toHaveBeenCalledTimes(1);
  });

  // ── Run-of-show ──

  it("rosAddItem calls rosAddItem", () => {
    register();
    dispatch("rosAddItem");
    expect(_rosAddItemMock).toHaveBeenCalledTimes(1);
  });

  it("rosResetDefault calls rosResetDefault", () => {
    register();
    dispatch("rosResetDefault");
    expect(_rosResetDefaultMock).toHaveBeenCalledTimes(1);
  });

  // ── Print preview ──

  it("openPrintPreview opens printPreviewModal", () => {
    register();
    dispatch("openPrintPreview");
    expect(_openModalMock).toHaveBeenCalledWith("printPreviewModal");
  });

  it("previewPrintSection calls buildPreviewHtml with select value", () => {
    register();
    const sel = document.createElement("select");
    sel.id = "printSectionSelect";
    const opt = document.createElement("option");
    opt.value = "guests";
    sel.appendChild(opt);
    sel.value = "guests";
    document.body.appendChild(sel);
    const pane = document.createElement("div");
    pane.id = "printPreviewPane";
    document.body.appendChild(pane);
    dispatch("previewPrintSection");
    expect(_buildPreviewHtmlMock).toHaveBeenCalledWith("guests");
    document.body.removeChild(sel);
    document.body.removeChild(pane);
  });

  it("executePrint calls executePrint with select value", () => {
    register();
    const sel = document.createElement("select");
    sel.id = "printSectionSelect";
    const opt = document.createElement("option");
    opt.value = "vendors";
    sel.appendChild(opt);
    sel.value = "vendors";
    document.body.appendChild(sel);
    dispatch("executePrint");
    expect(_executePrintMock).toHaveBeenCalledWith("vendors");
    document.body.removeChild(sel);
  });
});
