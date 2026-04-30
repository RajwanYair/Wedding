/**
 * src/types.d.ts — Shared type definitions for the Wedding Manager (v17.0.0)
 *
 * TypeScript-first types with discriminated unions derived from canonical
 * constants where possible.
 * Import: `import type { Guest, Table } from './types';`
 */

import {
  GUEST_GROUPS,
  GUEST_SIDES,
  GUEST_STATUSES,
  MEAL_TYPES,
  TABLE_SHAPES,
} from "./core/constants.js";

// ── Enums (discriminated union string literals) ───────────────────────────

export type GuestStatus = (typeof GUEST_STATUSES)[number];
export type GuestSide = (typeof GUEST_SIDES)[number];
export type GuestGroup = (typeof GUEST_GROUPS)[number];
export type MealType = (typeof MEAL_TYPES)[number];
export type TableShape = (typeof TABLE_SHAPES)[number];
export type BackendType = "sheets" | "supabase" | "both" | "none";
export type AuthProvider = "google" | "facebook" | "apple" | "anonymous" | "email";

// ── Core Data Models ──────────────────────────────────────────────────────

/** Guest record stored in the reactive store. */
export interface Guest {
  readonly id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  count: number;
  children: number;
  status: GuestStatus;
  side: GuestSide;
  group: GuestGroup;
  meal: MealType;
  mealNotes: string;
  accessibility: string;
  transport: string;
  tableId: string | null | undefined;
  gift: string;
  notes: string;
  sent: boolean;
  checkedIn: boolean;
  rsvpDate: string;
  rsvpSource: string;
  tags?: string[];
  vip?: boolean;
  history?: GuestNote[];
  createdAt: string;
  updatedAt: string;
  /** Soft-delete timestamp; null means active. */
  deletedAt?: string | null;
}

/** A note entry in guest history. */
export interface GuestNote {
  text: string;
  date: string;
}

/** Table record stored in the reactive store. */
export interface Table {
  readonly id: string;
  name: string;
  capacity: number;
  shape: TableShape;
}

/** Vendor record stored in the reactive store. */
export interface Vendor {
  readonly id: string;
  category: string;
  name: string;
  contact: string;
  phone: string;
  price: number;
  paid: number;
  dueDate: string;
  notes: string;
  contractUrl: string;
  updatedAt: string;
  createdAt: string;
  /** Soft-delete timestamp; null means active. */
  deletedAt?: string | null;
}

/** Expense record stored in the reactive store. */
export interface Expense {
  readonly id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  createdAt: string;
}

/** RSVP log entry — immutable record of each guest response. */
export interface RsvpLogEntry {
  readonly id: string;
  guestId: string;
  guestName: string;
  phone: string;
  status: GuestStatus;
  count: number;
  children: number;
  timestamp: string;
  source: "web" | "manual" | "import";
  notes?: string;
}

/** Timeline item stored in the reactive store. */
export interface TimelineItem {
  readonly id: string;
  time: string;
  icon: string;
  title: string;
  note: string;
}

/** Wedding info record (key-value pairs in the store). */
export interface WeddingInfo {
  groom: string;
  bride: string;
  groomEn: string;
  brideEn: string;
  date: string;
  hebrewDate: string;
  time: string;
  ceremonyTime: string;
  rsvpDeadline: string;
  venue: string;
  venueAddress: string;
  venueWaze: string;
  venueMapLink: string;
  budgetTarget: number;
  registryLinks: string;
}

/** Gallery photo entry. */
export interface GalleryPhoto {
  readonly id: string;
  dataUrl: string;
  caption: string;
  createdAt: string;
}

/** Budget entry. */
export interface BudgetEntry {
  readonly id: string;
  category: string;
  label: string;
  estimate: number;
  actual: number;
}

/** Contact form submission. */
export interface ContactSubmission {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  side: string;
  dietaryNotes: string;
}

/** Campaign delivery status per guest. */
export type CampaignDeliveryResult = "pending" | "sent" | "failed";

/** Campaign lifecycle status. */
export type CampaignStatus = "draft" | "queued" | "sending" | "completed" | "failed" | "cancelled";

/** Supported campaign channels. */
export type CampaignType = "whatsapp" | "email" | "sms";

/** Outbound messaging campaign persisted in store. */
export interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  templateName: string;
  guestIds: string[];
  status: CampaignStatus;
  sentCount: number;
  failedCount: number;
  results: Record<string, CampaignDeliveryResult>;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
}

/** Application error captured by the client error pipeline. */
export interface AppError {
  id: string;
  type: string;
  message: string;
  stack?: string;
  context: Record<string, unknown>;
  version: string;
  ts: number;
}

export interface AuditLogEntry {
  action?: string;
  entity?: string;
  entityId?: string | null;
  userEmail?: string;
  ts?: string;
  diff?: unknown;
}

export interface BudgetEnvelopeEntry {
  amount: number;
  note?: string;
  ts: number;
}

export interface BudgetEnvelope {
  category: string;
  limit: number;
  spent: number;
  entries: BudgetEnvelopeEntry[];
  updatedAt: number;
}

export interface CheckinSession {
  id: string;
  eventId: string;
  startedAt: number;
  endedAt?: number | null;
  checkIns: Record<string, { ts: number; partySize: number }>;
  active: boolean;
}

export interface CommunicationLogEntry {
  id: string;
  guestId: string;
  guestName: string;
  type: "sms" | "whatsapp" | "email";
  message: string;
  status: "pending" | "sent" | "failed";
  ts: string;
}

export type DeliveryStatus = "sent" | "delivered" | "read" | "failed" | "bounced";
export type DeliveryChannel = "whatsapp" | "email" | "sms";

export interface DeliveryRecord {
  id: string;
  guestId: string;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  messageId?: string;
  campaignId?: string;
  ts: number;
}

export interface DonationGoal {
  id: string;
  name: string;
  target: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Donation {
  id: string;
  goalId: string;
  amount: number;
  donorName: string;
  note: string;
  createdAt: string;
}

export interface IssuedToken {
  guestId: string;
  token: string;
  issuedAt: number;
}

export type NotificationChannel = "push" | "email" | "whatsapp" | "sms";
export type NotificationEvent =
  | "rsvp_confirmed"
  | "rsvp_reminder"
  | "table_assigned"
  | "campaign"
  | "system";

export interface NotificationPrefs {
  userId: string;
  channels: Record<NotificationChannel, boolean>;
  events: Record<NotificationEvent, boolean>;
  updatedAt: number;
}

export interface OfflineQueueItem {
  type: string;
  payload: unknown;
  addedAt: string;
  retries: number;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  expirationTime: number | null;
}

export interface SeatingConstraint {
  id: string;
  guestId: string;
  type: "near" | "far";
  targetGuestId: string;
  createdAt: string;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret?: string | null;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: unknown;
  status: "pending" | "delivered" | "failed";
  statusCode?: number;
  error?: string;
  ts: number;
}

// ── Service Types ─────────────────────────────────────────────────────────

/** Result type returned by save/validate functions. */
export interface SaveResult {
  ok: boolean;
  errors?: string[];
}

/** Authenticated user shape returned by auth service. */
export interface AuthUser {
  name: string;
  email: string;
  picture: string;
  isAdmin: boolean;
  provider: AuthProvider;
}

// ── Store Type Map ────────────────────────────────────────────────────────

/**
 * Store key → value type map.
 * Used for typed storeGet/storeSet operations.
 */
export interface StoreKeys {
  guests: Guest[];
  campaigns: Campaign[];
  approvedEmails: string[];
  auditLog: AuditLogEntry[];
  backendType: BackendType | "";
  tables: Table[];
  vendors: Vendor[];
  expenses: Expense[];
  donationGoals: DonationGoal[];
  donations: Donation[];
  appErrors: AppError[];
  timeline: TimelineItem[];
  gallery: GalleryPhoto[];
  weddingInfo: WeddingInfo;
  budget: BudgetEntry[];
  budgetEnvelopes: Record<string, BudgetEnvelope>;
  checkinSessions: CheckinSession[];
  commLog: CommunicationLogEntry[];
  contacts: ContactSubmission[];
  deliveries: DeliveryRecord[];
  issuedTokens: IssuedToken[];
  notificationPreferences: Record<string, NotificationPrefs>;
  offline_queue: OfflineQueueItem[];
  push_subscriptions: PushSubscriptionData[];
  rsvp_log: RsvpLogEntry[];
  seatingConstraints: SeatingConstraint[];
  sheetsWebAppUrl: string;
  supabaseAnonKey: string;
  supabaseUrl: string;
  timelineDone: Record<string, boolean>;
  webhookDeliveries: WebhookDelivery[];
  webhooks: Webhook[];
}

/** Valid store key names. */
export type StoreKey = keyof StoreKeys;

// ── Subscription Types ────────────────────────────────────────────────────

/** Callback for store subscriptions. */
export type StoreSubscriber<K extends StoreKey = StoreKey> = (value: StoreKeys[K]) => void;

/** Wildcard subscriber receives key + value. */
export type StoreWildcardSubscriber = (key: StoreKey, value: unknown) => void;

/** Unsubscribe function returned by storeSubscribe. */
export type Unsubscribe = () => void;

// ── Pagination Types ──────────────────────────────────────────────────────

/** Cursor-based page request. */
export interface PageRequest {
  cursor?: string;
  limit: number;
  orderBy?: string;
  orderDir?: "asc" | "desc";
}

/** Page result with next-cursor and total count. */
export interface PageResult<T> {
  items: T[];
  nextCursor: string | null;
  total: number;
}

// ── Role-Based Access Types ───────────────────────────────────────────────

/** Role for access control. */
export type UserRole = "admin" | "guest" | "anonymous";

/** Fine-grained permissions per role. */
export type Permission =
  | "guests:read"
  | "guests:write"
  | "guests:delete"
  | "tables:read"
  | "tables:write"
  | "vendors:read"
  | "vendors:write"
  | "expenses:read"
  | "expenses:write"
  | "settings:write"
  | "rsvp:submit"
  | "checkin:write"
  | "export:any"
  | "audit:read";

/** Role → permissions map. */
export type RolePermissions = Record<UserRole, Set<Permission>>;

// ── Message / Notification Types ─────────────────────────────────────────

/** Status of a sent message. */
export type MessageStatus = "pending" | "sent" | "failed" | "delivered" | "read";

/** A reusable message template. */
export interface MessageTemplate {
  readonly id: string;
  name: string;
  channel: "whatsapp" | "email" | "sms";
  bodyHe: string;
  bodyEn: string;
  variables: string[];
  createdAt: string;
  updatedAt: string;
}

/** Record of a single message delivery attempt. */
export interface MessageDelivery {
  readonly id: string;
  guestId: string;
  templateId: string;
  channel: "whatsapp" | "email" | "sms";
  status: MessageStatus;
  sentAt: string | null;
  error: string | null;
  createdAt: string;
}

// ── Audit & Observability Types ───────────────────────────────────────────

/** Admin action audit entry. */
export interface AuditEntry {
  readonly id: string;
  action: string;
  entity: string;
  entityId: string;
  before: unknown;
  after: unknown;
  adminEmail: string;
  createdAt: string;
}

/** Client-side error capture entry. */
export interface ErrorEntry {
  readonly id: string;
  message: string;
  stack: string;
  context: Record<string, unknown>;
  url: string;
  userAgent: string;
  createdAt: string;
}

// ── Sync State Types ──────────────────────────────────────────────────────

/** Sync status per domain key. */
export type SyncStatus = "idle" | "syncing" | "pending" | "error" | "offline";

/** Sync state metadata for a single domain key. */
export interface SyncState {
  key: string;
  status: SyncStatus;
  lastSyncAt: string | null;
  pendingWrites: number;
  error: string | null;
}

// ── Conflict Types ────────────────────────────────────────────────────────

/** Conflict detected during sync. */
export interface ConflictInfo {
  key: string;
  localValue: unknown;
  remoteValue: unknown;
  localUpdatedAt: string;
  remoteUpdatedAt: string;
}

/** Resolution strategy for a conflict. */
export type ConflictResolution = "keep_local" | "keep_remote" | "merge";

// ── Section Contract Types ────────────────────────────────────────────────

/** Capabilities a section can declare. */
export interface SectionCapabilities {
  /** Section supports offline mode. */
  offline?: boolean;
  /** Section is accessible to anonymous/guest users. */
  public?: boolean;
  /** Section has printable content. */
  printable?: boolean;
  /** Section supports keyboard shortcuts. */
  shortcuts?: boolean;
  /** Section emits analytics events. */
  analytics?: boolean;
}

/** Formal section lifecycle interface. */
export interface SectionLifecycle {
  /** Mount the section into the given container. */
  mount(container: HTMLElement): void | Promise<void>;
  /** Unmount and clean up (unsubscribe, remove listeners). */
  unmount(): void;
  /** Optional capabilities metadata. */
  capabilities?: SectionCapabilities;
}

// ── Repository Interface Types ────────────────────────────────────────────

/** Base repository interface with CRUD + pagination. */
export interface Repository<T extends { id: string }> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  getPage(req: PageRequest): Promise<PageResult<T>>;
  create(item: Omit<T, "id" | "createdAt" | "updatedAt">): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

/** Guest-specific repository with additional lookup methods. */
export interface GuestRepository extends Repository<Guest> {
  findByPhone(phone: string): Promise<Guest | null>;
  findByStatus(status: GuestStatus): Promise<Guest[]>;
  findByTable(tableId: string): Promise<Guest[]>;
  bulkUpdateStatus(ids: string[], status: GuestStatus): Promise<void>;
  bulkAssignTable(ids: string[], tableId: string): Promise<void>;
}

/** Table repository with seating helpers. */
export interface TableRepository extends Repository<Table> {
  findAvailable(minCapacity: number): Promise<Table[]>;
}

/** Vendor repository. */
export interface VendorRepository extends Repository<Vendor> {
  findByCategory(category: string): Promise<Vendor[]>;
}

/** Expense repository. */
export interface ExpenseRepository extends Repository<Expense> {
  sumByCategory(): Promise<Record<string, number>>;
}

/** Timeline event repository. */
export interface TimelineRepository extends Repository<TimelineItem> {
  /** Return all events ordered by time ascending. */
  getOrdered(): Promise<TimelineItem[]>;
  /** Mark an event done/undone. */
  setDone(id: string, done: boolean): Promise<void>;
}

/** RSVP log repository — append-only guest response log. */
export interface RsvpLogRepository {
  /** Append a new RSVP log entry. */
  append(entry: RsvpLogEntry): Promise<void>;
  /** Return all log entries (most recent first). */
  getAll(): Promise<RsvpLogEntry[]>;
  /** Return entries for a specific guest id. */
  getByGuest(guestId: string): Promise<RsvpLogEntry[]>;
}

// ── Data Classification ───────────────────────────────────────────────────

/** Data sensitivity classification. */
export type DataClass = "public" | "guest-private" | "admin-sensitive" | "operational";

/** Store key → data classification map. */
export type StoreDataClass = Record<keyof StoreKeys, DataClass>;

