/**
 * src/sections/changelog.js — Changelog section ESM module
 *
 * Fetches CHANGELOG.md and renders it as formatted HTML.
 */

import { mdToHtml } from "../utils/md-to-html.js";

/** @type {string|null} cached rendered HTML */
let _cached = null;

export function mount(/** @type {HTMLElement} */ _container) {
  renderChangelog();
}

export function unmount() {
  // no subscriptions to clean up
}

export async function renderChangelog() {
  const el = document.getElementById("changelogContent");
  if (!el) return;

  if (_cached) {
    el.innerHTML = _cached; // nosec: _cached is fetched from CHANGELOG.md (own repo file, not user input)
    return;
  }

  try {
    const resp = await fetch("./CHANGELOG.md", { cache: "no-store" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const md = await resp.text();
    const html = mdToHtml(md);
    _cached = html;
    el.innerHTML = html;
  } catch {
    el.textContent = "Failed to load changelog.";
  }
}
