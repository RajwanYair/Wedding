/**
 * src/services/audit-pipeline.js — Admin audit event pipeline (Sprint 88)
 *
 * Collects audit events from any module, enriches them with classification
 * metadata, and batches writes to the `audit_log` Supabase table.
 * Falls back to console.warn when Supabase is unavailable.
 */

/** @typedef {import("@supabase/supabase-js").SupabaseClient} SupabaseClient */

/**
 * @typedef {"low"|"medium"|"high"|"critical"} Severity
 *
 * @typedef {{
 *   action: string,
 *   entityType?: string,
 *   entityId?: string,
 *   userId?: string,
 *   severity?: Severity,
 *   metadata?: Record<string, unknown>
 * }} AuditEvent
 *
 * @typedef {{
 *   log(event: AuditEvent): void,
 *   flush(): Promise<void>,
 *   pending(): number,
 *   destroy(): void
 * }} AuditPipeline
 */

const BATCH_SIZE = 20;
const FLUSH_MS = 5_000;

/**
 * Actions that require at least "high" severity.
 */
const HIGH_SEVERITY_ACTIONS = new Set([
  "guest.delete",
  "guest.erase",
  "user.ban",
  "settings.change",
  "admin.login",
  "admin.logout",
]);

/**
 * Resolve severity — caller hint is respected but certain actions are elevated.
 * @param {string} action
 * @param {Severity} [hint]
 * @returns {Severity}
 */
function resolveSeverity(action, hint) {
  if (HIGH_SEVERITY_ACTIONS.has(action)) {
    const levels = ["low", "medium", "high", "critical"];
    const hintIdx = hint ? levels.indexOf(hint) : -1;
    return hintIdx >= 2 ? hint : "high";
  }
  return hint ?? "low";
}

/**
 * Create an audit pipeline.
 *
 * @param {SupabaseClient | null} supabase  Pass null for offline / test mode.
 * @param {{ batchSize?: number, flushMs?: number }} [opts]
 * @returns {AuditPipeline}
 */
export function createAuditPipeline(supabase, opts = {}) {
  const batchSize = opts.batchSize ?? BATCH_SIZE;
  const flushMs = opts.flushMs ?? FLUSH_MS;

  /** @type {AuditEvent[]} */
  const queue = [];
  let timer = null;
  let destroyed = false;

  function scheduleFlush() {
    if (timer || destroyed) return;
    timer = setTimeout(() => {
      timer = null;
      flushQueue();
    }, flushMs);
  }

  async function flushQueue() {
    if (queue.length === 0) return;
    const batch = queue.splice(0, batchSize);
    if (!supabase) {
      // Offline fallback
      for (const e of batch) {
        console.warn("[audit]", e.action, e.severity, e.entityType, e.entityId);
      }
      return;
    }
    try {
      await supabase.from("audit_log").insert(batch);
    } catch {
      // Re-queue failed batch at front
      queue.unshift(...batch);
    }
  }

  return {
    /**
     * Enqueue an audit event (non-blocking).
     * @param {AuditEvent} event
     */
    log(event) {
      if (destroyed) return;
      const enriched = {
        ...event,
        severity: resolveSeverity(event.action, event.severity),
        logged_at: new Date().toISOString(),
      };
      queue.push(enriched);
      if (queue.length >= batchSize) {
        flushQueue();
      } else {
        scheduleFlush();
      }
    },

    /** Flush all pending events immediately. */
    async flush() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      await flushQueue();
    },

    /** Number of events awaiting flush. */
    pending() {
      return queue.length;
    },

    /** Stop accepting new events and clear the timer. */
    destroy() {
      destroyed = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
