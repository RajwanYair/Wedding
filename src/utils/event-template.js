/**
 * src/utils/event-template.js
 * Wedding event cloning and template system.
 * Allows saving a wedding configuration as a reusable template and
 * instantiating new events from it.
 * Pure data — no DOM, no network, no localStorage.
 *
 * @module event-template
 */

// ── Template types ─────────────────────────────────────────────────────────

/**
 * Template categories (what parts of the event are captured).
 * @type {Readonly<string[]>}
 */
export const TEMPLATE_SECTIONS = Object.freeze([
  "weddingInfo",
  "tables",
  "vendors",
  "budget",
  "schedule",
  "settings",
]);

// ── Builders ──────────────────────────────────────────────────────────────

/**
 * Creates a template from a live event snapshot.
 * Strips guest PII (name, phone) but preserves structure (table count, capacity).
 * @param {object} eventSnapshot - full store snapshot
 * @param {{ name: string, description?: string }} meta
 * @returns {{ id: string, name: string, description: string, createdAt: string, sections: object }}
 */
export function createTemplate(eventSnapshot, meta) {
  if (!eventSnapshot || !meta?.name) return null;

  const id = `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const sections = {};

  // Wedding info — keep structure, zero out personal dates
  if (eventSnapshot.weddingInfo) {
    const { coupleNames: _coupleNames, venue, guestCount, ...rest } =
      eventSnapshot.weddingInfo;
    sections.weddingInfo = {
      coupleNames: "",
      venue: venue ?? "",
      guestCount: guestCount ?? 0,
      ...rest,
    };
  }

  // Tables — keep shape/capacity, strip assignments
  if (Array.isArray(eventSnapshot.tables)) {
    sections.tables = eventSnapshot.tables.map(
      ({ id: tid, name, capacity, shape, position }) => ({
        id: tid,
        name,
        capacity: capacity ?? 0,
        shape: shape ?? "round",
        position: position ?? null,
      }),
    );
  }

  // Vendors — keep category + name template, zero costs
  if (Array.isArray(eventSnapshot.vendors)) {
    sections.vendors = eventSnapshot.vendors.map(({ category, name }) => ({
      category: category ?? "other",
      name: name ?? "",
      price: 0,
      paid: 0,
    }));
  }

  // Budget — keep allocations, zero actuals
  if (Array.isArray(eventSnapshot.budget)) {
    sections.budget = eventSnapshot.budget.map(({ category, allocated }) => ({
      category,
      allocated: allocated ?? 0,
      spent: 0,
    }));
  }

  // Schedule — keep items, blank out actual times
  if (Array.isArray(eventSnapshot.schedule)) {
    sections.schedule = eventSnapshot.schedule.map(
      ({ phase, title, durationMin }) => ({
        phase,
        title: title ?? "",
        durationMin: durationMin ?? 0,
      }),
    );
  }

  // Settings — copy verbatim (theme, locale, etc.)
  if (eventSnapshot.settings) {
    sections.settings = { ...eventSnapshot.settings };
  }

  return {
    id,
    name: String(meta.name).trim(),
    description: String(meta.description ?? "").trim(),
    createdAt: new Date().toISOString(),
    sections,
  };
}

/**
 * Instantiates a new event object from a template.
 * @param {object} template - a template created by `createTemplate`
 * @param {{ coupleNames?: string, weddingDate?: string, venue?: string }} overrides
 * @returns {object} event snapshot ready for store initialisation
 */
export function instantiateTemplate(template, overrides = {}) {
  if (!template?.sections) return null;

  const { sections } = template;
  const event = {};

  if (sections.weddingInfo) {
    event.weddingInfo = {
      ...sections.weddingInfo,
      coupleNames:
        overrides.coupleNames ?? sections.weddingInfo.coupleNames ?? "",
      weddingDate: overrides.weddingDate ?? "",
      venue: overrides.venue ?? sections.weddingInfo.venue ?? "",
    };
  }

  if (sections.tables) {
    event.tables = sections.tables.map((t) => ({
      ...t,
      id: `t_${Math.random().toString(36).slice(2, 9)}`,
      guests: [],
    }));
  }

  if (sections.vendors) {
    event.vendors = sections.vendors.map((v) => ({
      ...v,
      id: `v_${Math.random().toString(36).slice(2, 9)}`,
    }));
  }

  if (sections.budget) {
    event.budget = sections.budget.map((b) => ({ ...b, spent: 0 }));
  }

  if (sections.schedule) {
    event.schedule = sections.schedule.map((s) => ({
      ...s,
      id: `sch_${Math.random().toString(36).slice(2, 9)}`,
      startOffset: 0,
    }));
  }

  if (sections.settings) {
    event.settings = { ...sections.settings };
  }

  event.guests = [];
  event.createdAt = new Date().toISOString();
  event.templateId = template.id;

  return event;
}

// ── Template utilities ─────────────────────────────────────────────────────

/**
 * Returns a summary of what a template contains.
 * @param {object} template
 * @returns {{ name: string, tableCount: number, vendorCount: number, hasBudget: boolean, hasSchedule: boolean }}
 */
export function describeTemplate(template) {
  if (!template?.sections) {
    return {
      name: "",
      tableCount: 0,
      vendorCount: 0,
      hasBudget: false,
      hasSchedule: false,
    };
  }
  return {
    name: template.name ?? "",
    tableCount: template.sections.tables?.length ?? 0,
    vendorCount: template.sections.vendors?.length ?? 0,
    hasBudget:
      Array.isArray(template.sections.budget) &&
      template.sections.budget.length > 0,
    hasSchedule:
      Array.isArray(template.sections.schedule) &&
      template.sections.schedule.length > 0,
  };
}

/**
 * Returns the sections present in a template.
 * @param {object} template
 * @returns {string[]}
 */
export function getTemplateSections(template) {
  if (!template?.sections) return [];
  return TEMPLATE_SECTIONS.filter((s) => template.sections[s] !== undefined);
}

/**
 * Merges two templates: `base` is overridden section-by-section by `override`.
 * @param {object} base
 * @param {object} override
 * @returns {object}
 */
export function mergeTemplates(base, override) {
  if (!base) return override ?? null;
  if (!override) return base;
  return {
    ...base,
    ...override,
    sections: {
      ...(base.sections ?? {}),
      ...(override.sections ?? {}),
    },
  };
}

/**
 * Strips a specific section from a template copy.
 * @param {object} template
 * @param {string} section
 * @returns {object}
 */
export function omitSection(template, section) {
  if (!template?.sections) return template;
  const { [section]: _removed, ...rest } = template.sections;
  return { ...template, sections: rest };
}
