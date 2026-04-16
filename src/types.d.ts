/**
 * src/types.d.ts — Shared type definitions for the Wedding Manager (v6.0)
 *
 * TypeScript-first types with discriminated unions and strict enums.
 * Import: `import type { Guest, Table } from './types';`
 */

// ── Enums (discriminated union string literals) ───────────────────────────

export type GuestStatus = "pending" | "confirmed" | "declined" | "maybe";
export type GuestSide = "groom" | "bride" | "mutual";
export type GuestGroup = "family" | "friends" | "work" | "other";
export type MealType = "regular" | "vegetarian" | "vegan" | "gluten_free" | "kosher";
export type TableShape = "round" | "rect";
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
  tableId: string;
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
  tables: Table[];
  vendors: Vendor[];
  expenses: Expense[];
  timeline: TimelineItem[];
  gallery: GalleryPhoto[];
  weddingInfo: WeddingInfo;
  budget: BudgetEntry[];
  contacts: ContactSubmission[];
  timelineDone: Record<string, boolean>;
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

