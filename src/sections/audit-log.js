/**
 * src/sections/audit-log.js — Audit log viewer section (S588)
 *
 * Reads audit_log entries from Supabase and displays a paginated,
 * filterable table. Accessible from Settings or via direct navigation.
 *
 * @owner settings
 */

import { BaseSection, fromSection } from "../core/section-base.js";
import { el } from "../core/dom.js";
import { getSupabaseClient } from "../core/supabase-client.js";
import { formatRelative as formatRelativeDate } from "../utils/date.js";

const PAGE_SIZE = 25;

class AuditLogSection extends BaseSection {
  /** @type {number} */
  _page = 0;
  /** @type {string} */
  _actorFilter = "";
  /** @type {string} */
  _actionFilter = "";
  /** @type {string} */
  _dateFilter = "";

  async onMount() {
    this._bindFilters();
    await this._fetchAndRender();
  }

  _bindFilters() {
    const actorEl = el.auditLogActorFilter;
    const actionEl = el.auditLogActionFilter;
    const dateEl = el.auditLogDateRange;

    if (actorEl) {
      actorEl.addEventListener("change", () => {
        // @ts-ignore
        this._actorFilter = actorEl.value;
        this._page = 0;
        this._fetchAndRender();
      });
    }
    if (actionEl) {
      actionEl.addEventListener("change", () => {
        // @ts-ignore
        this._actionFilter = actionEl.value;
        this._page = 0;
        this._fetchAndRender();
      });
    }
    if (dateEl) {
      dateEl.addEventListener("change", () => {
        // @ts-ignore
        this._dateFilter = dateEl.value;
        this._page = 0;
        this._fetchAndRender();
      });
    }
  }

  async _fetchAndRender() {
    const supabase = getSupabaseClient();
    if (!supabase) {
      this._renderEmpty();
      return;
    }

    let query = supabase
      .from("audit_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(this._page * PAGE_SIZE, (this._page + 1) * PAGE_SIZE - 1);

    if (this._actorFilter) {
      query = query.eq("actor_email", this._actorFilter);
    }
    if (this._actionFilter) {
      query = query.eq("action", this._actionFilter);
    }
    if (this._dateFilter) {
      query = query.gte("created_at", `${this._dateFilter}T00:00:00`);
      query = query.lte("created_at", `${this._dateFilter}T23:59:59`);
    }

    const { data, count, error } = await query;

    if (error || !data || data.length === 0) {
      this._renderEmpty();
      return;
    }

    this._renderRows(data, count ?? data.length);
  }

  /**
   * @param {Array<Record<string, unknown>>} rows
   * @param {number} total
   */
  _renderRows(rows, total) {
    const tbody = el.auditLogBody;
    const emptyEl = el.auditLogEmpty;
    const pageInfo = el.auditLogPageInfo;

    if (emptyEl) emptyEl.classList.add("u-hidden");

    if (tbody) {
      tbody.textContent = "";
      for (const row of rows) {
        const tr = document.createElement("tr");

        const tdTime = document.createElement("td");
        tdTime.textContent = formatRelativeDate(/** @type {string} */ (row.created_at));
        tr.appendChild(tdTime);

        const tdActor = document.createElement("td");
        tdActor.textContent = /** @type {string} */ (row.actor_email ?? "—");
        tr.appendChild(tdActor);

        const tdAction = document.createElement("td");
        tdAction.textContent = /** @type {string} */ (row.action ?? "");
        tr.appendChild(tdAction);

        const tdTarget = document.createElement("td");
        tdTarget.textContent = /** @type {string} */ (row.target_type ?? "");
        tr.appendChild(tdTarget);

        const tdDetails = document.createElement("td");
        tdDetails.textContent = row.details
          ? String(row.details).slice(0, 80)
          : "";
        tr.appendChild(tdDetails);

        tbody.appendChild(tr);
      }
    }

    if (pageInfo) {
      const totalPages = Math.ceil(total / PAGE_SIZE);
      pageInfo.textContent = `${this._page + 1} / ${totalPages}`;
    }
  }

  _renderEmpty() {
    const tbody = el.auditLogBody;
    const emptyEl = el.auditLogEmpty;

    if (tbody) tbody.textContent = "";
    if (emptyEl) emptyEl.classList.remove("u-hidden");
  }

  /** Navigate pages (called via data-action) */
  nextPage() {
    this._page++;
    this._fetchAndRender();
  }

  prevPage() {
    if (this._page > 0) {
      this._page--;
      this._fetchAndRender();
    }
  }
}

const sectionInstance = new AuditLogSection("audit-log");
export const { mount, unmount, capabilities } = fromSection(sectionInstance);
