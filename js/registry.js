"use strict";

/* ── Registry Links (v1.16.0) ────────────────────────────────────────────────
   Admin adds external gift registry URLs (Amazon, Zola, etc.).
   Displayed on the guest-facing landing page as clickable cards.
   Stored inside _weddingInfo.registries = [{id, name, url}]
   ─────────────────────────────────────────────────────────────────────────── */

/** Render the settings UI for managing registry links */
function renderRegistrySettings() {
  const container = document.getElementById("registrySettingsList");
  if (!container) return;
  const list = _weddingInfo.registries || [];
  container.innerHTML = "";

  if (!list.length) {
    const p = document.createElement("p");
    p.className = "empty-hint";
    p.setAttribute("data-i18n", "registry_settings_empty");
    p.textContent = t("registry_settings_empty");
    container.appendChild(p);
    return;
  }

  list.forEach(function (reg) {
    const row = document.createElement("div");
    row.className = "registry-row";

    const nameSpan = document.createElement("span");
    nameSpan.className = "registry-row-name";
    nameSpan.textContent = reg.name;

    const urlA = document.createElement("a");
    urlA.className = "registry-row-url";
    urlA.href = reg.url;
    urlA.target = "_blank";
    urlA.rel = "noopener noreferrer";
    urlA.textContent = reg.url.replace(/^https?:\/\//, "").split("/")[0];

    const delBtn = document.createElement("button");
    delBtn.className = "btn btn-danger btn-small";
    delBtn.setAttribute("onclick", 'removeRegistryLink("' + reg.id + '")');
    delBtn.textContent = "🗑";
    delBtn.setAttribute("aria-label", t("registry_remove"));

    row.appendChild(nameSpan);
    row.appendChild(urlA);
    row.appendChild(delBtn);
    container.appendChild(row);
  });
}

/** Add a new registry link from settings form inputs */
function addRegistryLink() {
  const nameEl = document.getElementById("registryInputName");
  const urlEl = document.getElementById("registryInputUrl");
  if (!nameEl || !urlEl) return;

  const name = sanitizeInput(nameEl.value.trim());
  const url = urlEl.value.trim();

  if (!name || !url) {
    showToast(t("registry_required"), "error");
    return;
  }
  if (!isValidHttpsUrl(url)) {
    showToast(t("invalid_url"), "error");
    return;
  }

  if (!_weddingInfo.registries) _weddingInfo.registries = [];
  _weddingInfo.registries.push({ id: uid(), name, url });
  saveAll();
  nameEl.value = "";
  urlEl.value = "";
  renderRegistrySettings();
  showToast(t("registry_added"), "success");
}

/** Remove a registry link by id */
function removeRegistryLink(id) {
  if (!_weddingInfo.registries) return;
  _weddingInfo.registries = _weddingInfo.registries.filter(function (r) {
    return r.id !== id;
  });
  saveAll();
  renderRegistrySettings();
  showToast(t("registry_removed"), "success");
}

/** Render registry cards on the guest-facing landing page */
function renderRegistryLinks() {
  const container = document.getElementById("landingRegistryList");
  if (!container) return;
  const list = _weddingInfo.registries || [];

  const section = document.getElementById("landingRegistrySection");
  if (section) section.style.display = list.length ? "" : "none";

  container.innerHTML = "";
  list.forEach(function (reg) {
    const a = document.createElement("a");
    a.className = "registry-card";
    a.href = reg.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";

    const icon = document.createElement("span");
    icon.className = "registry-card-icon";
    icon.textContent = "🎁";

    const name = document.createElement("span");
    name.className = "registry-card-name";
    name.textContent = reg.name;

    const arrow = document.createElement("span");
    arrow.className = "registry-card-arrow";
    arrow.textContent = "↗";

    a.appendChild(icon);
    a.appendChild(name);
    a.appendChild(arrow);
    container.appendChild(a);
  });
}
