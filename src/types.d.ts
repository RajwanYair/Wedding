/**
 * src/types.d.ts — Shared type definitions for the Wedding Manager (F1.3)
 *
 * These JSDoc-compatible types are used across src/ modules.
 * Import with `@typedef {import('./types').Guest} Guest` etc.
 */

/** Guest record stored in the reactive store. */
export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  count: string | number;
  children: string | number;
  status: "pending" | "confirmed" | "declined" | "maybe";
  side: "groom" | "bride" | "mutual";
  group: "family" | "friends" | "work" | "other";
  meal: "regular" | "vegetarian" | "vegan" | "gluten_free" | "kosher";
  mealNotes: string;
  accessibility: string;
  transport: string;
  tableId: string;
  gift: string;
  notes: string;
  sent: boolean | string;
  checkedIn: boolean | string;
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
  id: string;
  name: string;
  capacity: string | number;
  shape: "round" | "rect";
}

/** Vendor record stored in the reactive store. */
export interface Vendor {
  id: string;
  category: string;
  name: string;
  contact: string;
  phone: string;
  price: string | number;
  paid: string | number;
  dueDate: string;
  notes: string;
  contractUrl: string;
  updatedAt: string;
  createdAt: string;
}

/** Expense record stored in the reactive store. */
export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: string | number;
  date: string;
  createdAt: string;
}

/** Timeline item stored in the reactive store. */
export interface TimelineItem {
  id: string;
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
  budgetTarget: string | number;
}

/** Gallery photo entry. */
export interface GalleryPhoto {
  id: string;
  dataUrl: string;
  caption: string;
  createdAt: string;
}

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
  provider: string;
}

/** Budget entry. */
export interface BudgetEntry {
  id: string;
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

/**
 * F1.3.5 — Store key → value type map.
 * Used with `@type {import('./types').StoreKeys}` for typed storeGet/storeSet.
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
}

