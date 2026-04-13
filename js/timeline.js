"use strict";

/* ── Timeline — Wedding Day Schedule ── */

function renderTimeline() {
  const list = document.getElementById("timelineList");
  if (!list) return;

  const isAdmin = _authUser && _authUser.isAdmin;
  const adminBar = document.getElementById("timelineAdminBar");
  if (adminBar) adminBar.style.display = isAdmin ? "" : "none";

  list.innerHTML = "";

  const sorted = _timeline.slice().sort(function (a, b) {
    return a.time.localeCompare(b.time);
  });

  if (sorted.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = t("timeline_empty");
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
      editBtn.setAttribute("aria-label", t("timeline_edit"));
      editBtn.textContent = "✏️";
      editBtn.onclick = (function (id) {
        return function () {
          openEditTimelineModal(id);
        };
      })(item.id);

      const delBtn = document.createElement("button");
      delBtn.className = "btn-icon-sm";
      delBtn.setAttribute("aria-label", t("confirm_delete"));
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
  _editingTimelineId = null;
  const titleEl = document.getElementById("timelineModalTitle");
  if (titleEl) titleEl.textContent = t("timeline_add");
  document.getElementById("timelineTime").value = "";
  document.getElementById("timelineIcon").value = "📌";
  document.getElementById("timelineTitle").value = "";
  document.getElementById("timelineDesc").value = "";
  openModal("timelineModal");
}

function openEditTimelineModal(id) {
  const item = _timeline.find(function (i) {
    return i.id === id;
  });
  if (!item) return;
  _editingTimelineId = id;
  const titleEl = document.getElementById("timelineModalTitle");
  if (titleEl) titleEl.textContent = t("timeline_edit");
  document.getElementById("timelineTime").value = item.time;
  document.getElementById("timelineIcon").value = item.icon || "📌";
  document.getElementById("timelineTitle").value = item.title;
  document.getElementById("timelineDesc").value = item.description || "";
  openModal("timelineModal");
}

function saveTimelineItem() {
  const timeVal = document.getElementById("timelineTime").value.trim();
  const iconVal = document.getElementById("timelineIcon").value.trim() || "📌";
  const titleVal = sanitizeInput(
    document.getElementById("timelineTitle").value.trim(),
    100,
  );
  const descVal = sanitizeInput(
    document.getElementById("timelineDesc").value.trim(),
    300,
  );

  if (!timeVal || !titleVal) {
    showToast(t("timeline_required"), "warning");
    return;
  }

  if (_editingTimelineId) {
    const item = _timeline.find(function (i) {
      return i.id === _editingTimelineId;
    });
    if (item) {
      item.time = timeVal;
      item.icon = iconVal;
      item.title = titleVal;
      item.description = descVal;
    }
  } else {
    _timeline.push({
      id: uid(),
      time: timeVal,
      icon: iconVal,
      title: titleVal,
      description: descVal,
    });
  }

  saveAll();
  closeModal("timelineModal");
  renderTimeline();
  showToast(t("timeline_saved"), "success");
}

function deleteTimelineItem(id) {
  if (!confirm(t("confirm_delete"))) return;
  _timeline = _timeline.filter(function (i) {
    return i.id !== id;
  });
  saveAll();
  renderTimeline();
  showToast(t("timeline_deleted"), "success");
}
