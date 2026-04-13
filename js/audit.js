"use strict";

/* ── Audit Log (Sprint 4.3) ───────────────────────────────────────────────────
   Every admin write operation is recorded as a timestamped entry in a
   ring-buffer stored in localStorage (wedding_v1_audit, max 200 entries).
   The admin can view and clear the log from the Settings page.
   ─────────────────────────────────────────────────────────────────────────── */

const _AUDIT_MAX = 200;

/**
 * Record an audit event.
 * @param {string} action  — e.g. "guest_add", "guest_delete", "rsvp_submit"
 * @param {string} detail  — human-readable description (name, email…)
 */
function logAudit(action, detail) {
  const entry = {
    ts: new Date().toISOString(),
    action: String(action).slice(0, 50),
    detail: String(detail || "").slice(0, 200),
    user: _authUser ? _authUser.email || _authUser.name || "admin" : "guest",
  };
  _auditLog.unshift(entry); /* newest first */
  if (_auditLog.length > _AUDIT_MAX) _auditLog.length = _AUDIT_MAX;
  save("audit", _auditLog);
}

/**
 * Render the audit log table inside #auditLogBody (admin Settings card).
 */
function renderAuditLog() {
  const tbody = document.getElementById("auditLogBody");
  if (!tbody) return;

  if (_auditLog.length === 0) {
    tbody.innerHTML = "";
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.className = "empty-state";
    td.style.padding = "1rem";
    td.setAttribute("data-i18n", "audit_empty");
    td.textContent = t("audit_empty");
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  tbody.innerHTML = "";
  _auditLog.slice(0, 100).forEach(function (entry) {
    const tr = document.createElement("tr");

    /* Timestamp */
    const tdTs = document.createElement("td");
    tdTs.style.cssText =
      "font-size:0.75em; white-space:nowrap; direction:ltr; color:var(--text-muted);";
    const d = new Date(entry.ts);
    tdTs.textContent =
      d.toLocaleDateString("he-IL") +
      " " +
      d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });

    /* Action badge */
    const tdAction = document.createElement("td");
    const badge = document.createElement("span");
    badge.className =
      "audit-action-badge audit-" +
      (entry.action || "other").replace(/_/g, "-");
    badge.textContent = t("audit_action_" + entry.action) || entry.action;
    tdAction.appendChild(badge);

    /* Detail */
    const tdDetail = document.createElement("td");
    tdDetail.style.cssText = "font-size:0.82em; color:var(--text-secondary);";
    tdDetail.textContent = entry.detail || "—";

    /* User */
    const tdUser = document.createElement("td");
    tdUser.style.cssText =
      "font-size:0.78em; color:var(--text-muted); direction:ltr;";
    tdUser.textContent = entry.user || "—";

    tr.append(tdTs, tdAction, tdDetail, tdUser);
    tbody.appendChild(tr);
  });
}

/** Clear all audit entries (admin only). */
function clearAuditLog() {
  if (!_authUser || !_authUser.isAdmin) return;
  if (!confirm(t("audit_clear_confirm"))) return;
  _auditLog = [];
  save("audit", _auditLog);
  renderAuditLog();
  showToast(t("audit_cleared"), "success");
}
