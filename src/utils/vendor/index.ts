/**
 * src/utils/vendor/index.ts — Vendor CRM domain module (S677)
 *
 * Consolidated from:
 *   vendor-negotiate.js  · vendor-timeline.js
 *   vendor-sla.js        · vendor-inbox.js
 *
 * @module vendor
 * @owner vendor-crm
 */

// ── Negotiate types ───────────────────────────────────────────────────────

export type NegotiationStatus =
  | "pending"
  | "countered"
  | "accepted"
  | "rejected"
  | "expired";

export interface Offer {
  id: string;
  negotiationId: string;
  from: "vendor" | "client";
  amount: number;
  note: string;
  timestamp: number;
}

export interface Negotiation {
  id: string;
  vendorId: string;
  vendorName: string;
  service: string;
  initialAsk: number;
  budget: number;
  status: NegotiationStatus;
  offers: Offer[];
  createdAt: number;
  resolvedAt: number | null;
}

// ── Timeline types ────────────────────────────────────────────────────────

export type EventType =
  | "call"
  | "email"
  | "meeting"
  | "payment"
  | "milestone"
  | "note"
  | "contract";

export interface TimelineEvent {
  id: string;
  vendorId: string;
  type: EventType;
  title: string;
  description: string;
  timestamp: number;
  completed: boolean;
}

export interface Milestone {
  id: string;
  vendorId: string;
  label: string;
  dueDate: number;
  completed: boolean;
  completedAt: number | null;
}

// ── SLA types ─────────────────────────────────────────────────────────────

export interface VendorInteraction {
  vendorId: string;
  responseMinutes?: number;
  onTime?: boolean;
  accepted?: boolean;
}

// ── Inbox types ───────────────────────────────────────────────────────────

export interface VendorMessage {
  id: string;
  vendorId: string;
  channel: string;
  body: string;
  ts: string;
  read?: boolean;
  from?: string;
}

export interface VendorThread {
  vendorId: string;
  vendorName: string;
  messages: VendorMessage[];
}

// ── Private state ─────────────────────────────────────────────────────────

let _negIdCounter = 0;
let _tlIdCounter = 0;

// ── Negotiate exports ─────────────────────────────────────────────────────

/** Reset negotiation ID counter — testing only. */
export function resetNegotiateIdCounter(start = 0): void {
  _negIdCounter = start;
}

export function startNegotiation({
  vendorId,
  vendorName,
  service,
  initialAsk,
  budget,
}: {
  vendorId: string;
  vendorName: string;
  service: string;
  initialAsk: number;
  budget: number;
}): Negotiation {
  const id = `neg_${++_negIdCounter}`;
  return {
    id,
    vendorId,
    vendorName: (vendorName || "").trim(),
    service: (service || "").trim(),
    initialAsk: Math.max(0, initialAsk || 0),
    budget: Math.max(0, budget || 0),
    status: "pending",
    offers: [],
    createdAt: Date.now(),
    resolvedAt: null,
  };
}

export function submitOffer(
  negotiation: Negotiation,
  from: "vendor" | "client",
  amount: number,
  note = "",
): Negotiation {
  if (negotiation.status === "accepted" || negotiation.status === "rejected") {
    return negotiation;
  }
  const offer: Offer = {
    id: `offer_${++_negIdCounter}`,
    negotiationId: negotiation.id,
    from,
    amount: Math.max(0, amount),
    note,
    timestamp: Date.now(),
  };
  return {
    ...negotiation,
    status: "countered",
    offers: [...negotiation.offers, offer],
  };
}

export function acceptNegotiation(negotiation: Negotiation): Negotiation {
  if (negotiation.status === "accepted" || negotiation.status === "rejected") {
    return negotiation;
  }
  return { ...negotiation, status: "accepted", resolvedAt: Date.now() };
}

export function rejectNegotiation(negotiation: Negotiation): Negotiation {
  if (negotiation.status === "accepted" || negotiation.status === "rejected") {
    return negotiation;
  }
  return { ...negotiation, status: "rejected", resolvedAt: Date.now() };
}

export function getLatestOffer(negotiation: Negotiation): number {
  if (negotiation.offers.length === 0) return negotiation.initialAsk;
  return negotiation.offers[negotiation.offers.length - 1].amount;
}

export function getSavings(negotiation: Negotiation): number {
  const final = getLatestOffer(negotiation);
  return Math.max(0, negotiation.initialAsk - final);
}

export function getNegotiationProgress(negotiation: Negotiation): number {
  if (negotiation.initialAsk <= negotiation.budget) return 100;
  const gap = negotiation.initialAsk - negotiation.budget;
  const current = negotiation.initialAsk - getLatestOffer(negotiation);
  if (gap === 0) return 100;
  return Math.min(100, Math.max(0, Math.round((current / gap) * 100)));
}

export function getNegotiationStats(negotiations: Negotiation[]): {
  total: number;
  active: number;
  accepted: number;
  rejected: number;
  totalSavings: number;
  avgRounds: number;
} {
  let active = 0;
  let accepted = 0;
  let rejected = 0;
  let totalSavings = 0;
  let totalRounds = 0;

  for (const n of negotiations) {
    if (n.status === "accepted") {
      accepted++;
      totalSavings += getSavings(n);
    } else if (n.status === "rejected") {
      rejected++;
    } else {
      active++;
    }
    totalRounds += n.offers.length;
  }

  return {
    total: negotiations.length,
    active,
    accepted,
    rejected,
    totalSavings,
    avgRounds:
      negotiations.length > 0
        ? Math.round(totalRounds / negotiations.length)
        : 0,
  };
}

export function isWithinBudget(negotiation: Negotiation): boolean {
  return getLatestOffer(negotiation) <= negotiation.budget;
}

export function suggestCounterOffer(negotiation: Negotiation): number {
  const current = getLatestOffer(negotiation);
  const target = negotiation.budget;
  return Math.round((current + target) / 2);
}

// ── Timeline exports ──────────────────────────────────────────────────────

/** Reset timeline ID counter — testing only. */
export function resetTimelineIdCounter(start = 0): void {
  _tlIdCounter = start;
}

export function createTimelineEvent({
  vendorId,
  type,
  title,
  description,
  timestamp,
}: {
  vendorId: string;
  type?: EventType;
  title: string;
  description?: string;
  timestamp?: number;
}): TimelineEvent {
  return {
    id: `evt_${++_tlIdCounter}`,
    vendorId,
    type: type || "note",
    title: (title || "").trim(),
    description: (description || "").trim(),
    timestamp: timestamp || Date.now(),
    completed: false,
  };
}

export function createMilestone({
  vendorId,
  label,
  dueDate,
}: {
  vendorId: string;
  label: string;
  dueDate: number;
}): Milestone {
  return {
    id: `ms_${++_tlIdCounter}`,
    vendorId,
    label: (label || "").trim(),
    dueDate,
    completed: false,
    completedAt: null,
  };
}

export function completeMilestone(milestone: Milestone): Milestone {
  if (milestone.completed) return milestone;
  return { ...milestone, completed: true, completedAt: Date.now() };
}

export function completeEvent(event: TimelineEvent): TimelineEvent {
  return { ...event, completed: true };
}

export function sortByDate(
  events: TimelineEvent[],
  direction: "asc" | "desc" = "desc",
): TimelineEvent[] {
  return [...events].sort((a, b) =>
    direction === "desc"
      ? b.timestamp - a.timestamp
      : a.timestamp - b.timestamp,
  );
}

export function filterByVendor(
  events: TimelineEvent[],
  vendorId: string,
): TimelineEvent[] {
  return events.filter((e) => e.vendorId === vendorId);
}

export function filterByType(
  events: TimelineEvent[],
  type: EventType,
): TimelineEvent[] {
  return events.filter((e) => e.type === type);
}

export function getOverdueMilestones(
  milestones: Milestone[],
  now = Date.now(),
): Milestone[] {
  return milestones.filter((m) => !m.completed && m.dueDate < now);
}

export function getUpcomingMilestones(
  milestones: Milestone[],
  days: number,
  now = Date.now(),
): Milestone[] {
  const future = now + days * 86_400_000;
  return milestones.filter(
    (m) => !m.completed && m.dueDate >= now && m.dueDate <= future,
  );
}

export function getVendorTimelineSummary(
  events: TimelineEvent[],
  milestones: Milestone[],
  vendorId: string,
): {
  totalEvents: number;
  completedEvents: number;
  totalMilestones: number;
  completedMilestones: number;
  lastActivity: number | null;
} {
  const vendorEvents = filterByVendor(events, vendorId);
  const vendorMs = milestones.filter((m) => m.vendorId === vendorId);
  const completedEvents = vendorEvents.filter((e) => e.completed).length;
  const completedMs = vendorMs.filter((m) => m.completed).length;
  const sorted = sortByDate(vendorEvents, "desc");
  const lastActivity = sorted.length > 0 ? sorted[0].timestamp : null;

  return {
    totalEvents: vendorEvents.length,
    completedEvents,
    totalMilestones: vendorMs.length,
    completedMilestones: completedMs,
    lastActivity,
  };
}

export function groupByMonth(
  events: TimelineEvent[],
): Record<string, TimelineEvent[]> {
  const groups: Record<string, TimelineEvent[]> = {};
  for (const e of events) {
    const d = new Date(e.timestamp);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }
  return groups;
}

// ── SLA exports ───────────────────────────────────────────────────────────

export function avgResponseMinutes(
  interactions: readonly VendorInteraction[],
): number {
  if (!Array.isArray(interactions)) return 0;
  let sum = 0;
  let n = 0;
  for (const i of interactions) {
    if (
      typeof i?.responseMinutes === "number" &&
      Number.isFinite(i.responseMinutes)
    ) {
      sum += i.responseMinutes;
      n++;
    }
  }
  return n === 0 ? 0 : sum / n;
}

export function onTimeRate(
  interactions: readonly VendorInteraction[],
): number {
  if (!Array.isArray(interactions)) return 0;
  let total = 0;
  let onTime = 0;
  for (const i of interactions) {
    if (typeof i?.onTime === "boolean") {
      total++;
      if (i.onTime) onTime++;
    }
  }
  return total === 0 ? 0 : onTime / total;
}

export function acceptanceRate(
  interactions: readonly VendorInteraction[],
): number {
  if (!Array.isArray(interactions)) return 0;
  let total = 0;
  let accepted = 0;
  for (const i of interactions) {
    if (typeof i?.accepted === "boolean") {
      total++;
      if (i.accepted) accepted++;
    }
  }
  return total === 0 ? 0 : accepted / total;
}

export function scoreVendor(
  interactions: readonly VendorInteraction[],
  { targetMinutes = 60 }: { targetMinutes?: number } = {},
): number {
  const avg = avgResponseMinutes(interactions);
  const speedScore =
    avg <= 0
      ? 0
      : Math.max(0, Math.min(100, 100 * (targetMinutes / Math.max(avg, 1))));
  const onTime = onTimeRate(interactions) * 100;
  const accept = acceptanceRate(interactions) * 100;
  const blended = 0.4 * speedScore + 0.4 * onTime + 0.2 * accept;
  return Math.round(Math.max(0, Math.min(100, blended)));
}

export function scoreTier(
  score: number,
): "gold" | "silver" | "bronze" | "watch" {
  if (!Number.isFinite(score) || score < 0) return "watch";
  if (score >= 85) return "gold";
  if (score >= 65) return "silver";
  if (score >= 40) return "bronze";
  return "watch";
}

// ── Inbox exports ─────────────────────────────────────────────────────────

export function groupThreads(
  messages: readonly VendorMessage[],
  vendorNames: Record<string, string> = {},
): VendorThread[] {
  if (!Array.isArray(messages)) return [];
  const buckets = new Map<string, VendorMessage[]>();
  for (const m of messages) {
    if (!m?.vendorId) continue;
    const list = buckets.get(m.vendorId) ?? [];
    list.push(m);
    buckets.set(m.vendorId, list);
  }
  const threads: VendorThread[] = [];
  for (const [vendorId, list] of buckets) {
    list.sort((a, b) => Date.parse(a.ts ?? "") - Date.parse(b.ts ?? ""));
    threads.push({
      vendorId,
      vendorName: vendorNames[vendorId] ?? vendorId,
      messages: list,
    });
  }
  threads.sort((a, b) => lastActivity(b) - lastActivity(a));
  return threads;
}

export function lastActivity(thread: VendorThread): number {
  if (!thread?.messages?.length) return 0;
  const last = thread.messages[thread.messages.length - 1];
  const t = Date.parse(last?.ts ?? "");
  return Number.isFinite(t) ? t : 0;
}

export function unreadCount(thread: VendorThread): number {
  if (!thread?.messages?.length) return 0;
  return thread.messages.reduce((n, m) => n + (m.read === true ? 0 : 1), 0);
}

export function searchThreads(
  threads: readonly VendorThread[],
  query: string,
): VendorThread[] {
  const q = (query ?? "").trim().toLowerCase();
  if (!q) return [...(threads ?? [])];
  return (threads ?? []).filter((t) => {
    if (t.vendorName?.toLowerCase().includes(q)) return true;
    return t.messages.some((m) => (m.body ?? "").toLowerCase().includes(q));
  });
}
