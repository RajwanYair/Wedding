// @ts-check
"use strict";

/* ── Timeline — Wedding Day Schedule ── */

function renderTimeline() {
  const list = document.getElementById("timelineList");
  if (!list) return;

  const isAdmin = window._authUser && window._authUser.isAdmin;
  const adminBar = document.getElementById("timelineAdminBar");
  if (adminBar) adminBar.style.display = isAdmin ? "" : "none";

  list.replaceChildren();

  const sorted = window._timeline.slice().sort(function (a, b) {
    return a.time.localeCompare(b.time);
  });

  if (sorted.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = window.t("timeline_empty");
    list.appendChild(empty);
    return;
  }

  sorted.forEach(function (item) {
    const row = document.createElement("div");
    row.className = "timeline-item";

    const dot = document.createElement("div");
    dot.className = "timeline-dot";
    dot.setAttribute("aria-hidden", "true");
    dot.textContent = item.icon || "📌";

    const body = document.createElement("div");
    body.className = "timeline-content";

    const timeEl = document.createElement("div");
    timeEl.className = "timeline-time";
    timeEl.textContent = item.time;

    const titleEl = document.createElement("div");
    titleEl.className = "timeline-title";
    titleEl.textContent = item.title;

    body.appendChild(timeEl);
    body.appendChild(titleEl);

    if (item.description) {
      const desc = document.createElement("div");
      desc.className = "timeline-desc";
      desc.textContent = item.description;
      body.appendChild(desc);
    }

    if (isAdmin) {
      const acts = document.createElement("div");
      acts.className = "timeline-actions";

      const editBtn = document.createElement("button");
      editBtn.className = "btn-icon-sm";
      editBtn.setAttribute("aria-label", window.t("timeline_edit"));
      editBtn.textContent = "✏️";
      editBtn.onclick = (function (id) {
        return function () {
          openEditTimelineModal(id);
        };
      })(item.id);

      const delBtn = document.createElement("button");
      delBtn.className = "btn-icon-sm";
      delBtn.setAttribute("aria-label", window.t("confirm_delete"));
      delBtn.textContent = "🗑️";
      delBtn.onclick = (function (id) {
        return function () {
          deleteTimelineItem(id);
        };
      })(item.id);

      acts.appendChild(editBtn);
      acts.appendChild(delBtn);
      body.appendChild(acts);
    }

    row.appendChild(dot);
    row.appendChild(body);
    list.appendChild(row);
  });
}

function openAddTimelineModal() {
  window._editingTimelineId = null;
  const titleEl = document.getElementById("timelineModalTitle");
  if (titleEl) titleEl.textContent = window.t("timeline_add");
  document.getElementById("timelineTime").value = "";
  document.getElementById("timelineIcon").value = "📌";
  document.getElementById("timelineTitle").value = "";
  document.getElementById("timelineDesc").value = "";
  window.openModal("timelineModal");
}

function openEditTimelineModal(id) {
  const item = window._timeline.find(function (i) {
    return i.id === id;
  });
  if (!item) return;
  window._editingTimelineId = id;
  const titleEl = document.getElementById("timelineModalTitle");
  if (titleEl) titleEl.textContent = window.t("timeline_edit");
  document.getElementById("timelineTime").value = item.time;
  document.getElementById("timelineIcon").value = item.icon || "📌";
  document.getElementById("timelineTitle").value = item.title;
  document.getElementById("timelineDesc").value = item.description || "";
  window.openModal("timelineModal");
}

function saveTimelineItem() {
  const timeVal = document.getElementById("timelineTime").value.trim();
  const iconVal = document.getElementById("timelineIcon").value.trim() || "📌";
  const titleVal = window.sanitizeInput(
    document.getElementById("timelineTitle").value.trim(),
    100,
  );
  const descVal = window.sanitizeInput(
    document.getElementById("timelineDesc").value.trim(),
    300,
  );

  if (!timeVal || !titleVal) {
    window.showToast(window.t("timeline_required"), "warning");
    return;
  }

  if (window._editingTimelineId) {
    const item = window._timeline.find(function (i) {
      return i.id === window._editingTimelineId;
    });
    if (item) {
      item.time = timeVal;
      item.icon = iconVal;
      item.title = titleVal;
      item.description = descVal;
    }
  } else {
    window._timeline.push({
      id: window.uid(),
      time: timeVal,
      icon: iconVal,
      title: titleVal,
      description: descVal,
    });
  }

  window.saveAll();
  window.closeModal("timelineModal");
  renderTimeline();
  window.showToast(window.t("timeline_saved"), "success");
}

function deleteTimelineItem(id) {
  if (!confirm(window.t("confirm_delete"))) return;
  window._timeline = window._timeline.filter(function (i) {
    return i.id !== id;
  });
  window.saveAll();
  renderTimeline();
  window.showToast(window.t("timeline_deleted"), "success");
}
