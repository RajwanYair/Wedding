/**
 * src/types/supabase.d.ts — Supabase Database type definitions (S20c)
 *
 * Generated from the project's 22 SQL migrations.
 * Update this file whenever migrations change by running:
 *   npx supabase gen types typescript --project-id <PROJECT_ID> > src/types/supabase.d.ts
 *
 * Until Supabase is activated (SUPABASE_URL = ""), this file serves as the
 * canonical shape reference consumed by JSDoc @typedef annotations throughout
 * the source. When Supabase is live, replace the Row types with generated ones.
 */

// ── Row types ─────────────────────────────────────────────────────────────

export interface GuestRow {
  id: string;
  event_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  count: number;
  children: number;
  status: "pending" | "confirmed" | "declined" | "maybe";
  side: "groom" | "bride" | "mutual";
  group_name: "family" | "friends" | "work" | "neighbors" | "other";
  meal: "regular" | "vegetarian" | "vegan" | "gluten_free" | "kosher";
  meal_notes: string | null;
  accessibility: string | null;
  table_id: string | null;
  gift: string | null;
  notes: string | null;
  sent: boolean;
  checked_in: boolean;
  rsvp_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TableRow {
  id: string;
  event_id: string;
  name: string;
  capacity: number;
  shape: "round" | "rect";
}

export interface VendorRow {
  id: string;
  event_id: string;
  category: string;
  name: string;
  contact: string | null;
  phone: string | null;
  price: number;
  paid: number;
  notes: string | null;
  updated_at: string;
  created_at: string;
}

export interface ExpenseRow {
  id: string;
  event_id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  created_at: string;
}

export interface TimelineItemRow {
  id: string;
  event_id: string;
  time: string;
  title: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface WeddingInfoRow {
  event_id: string;
  groom: string | null;
  bride: string | null;
  date: string | null;
  venue: string | null;
  venue_address: string | null;
  updated_at: string;
}

export interface BudgetEntryRow {
  id: string;
  event_id: string;
  category: string;
  amount: number;
  notes: string | null;
  created_at: string;
}

export interface RsvpLogRow {
  id: string;
  event_id: string;
  phone: string;
  first_name: string;
  last_name: string;
  status: "confirmed" | "declined" | "maybe";
  count: number;
  timestamp: string;
}

// ── Database shape (used by Supabase client) ──────────────────────────────

export interface Database {
  public: {
    Tables: {
      guests: {
        Row: GuestRow;
        Insert: Omit<GuestRow, "created_at" | "updated_at">;
        Update: Partial<Omit<GuestRow, "id" | "event_id" | "created_at">>;
      };
      tables: {
        Row: TableRow;
        Insert: Omit<TableRow, "id">;
        Update: Partial<Omit<TableRow, "id" | "event_id">>;
      };
      vendors: {
        Row: VendorRow;
        Insert: Omit<VendorRow, "created_at" | "updated_at">;
        Update: Partial<Omit<VendorRow, "id" | "event_id" | "created_at">>;
      };
      expenses: {
        Row: ExpenseRow;
        Insert: Omit<ExpenseRow, "created_at">;
        Update: Partial<Omit<ExpenseRow, "id" | "event_id" | "created_at">>;
      };
      timeline_items: {
        Row: TimelineItemRow;
        Insert: Omit<TimelineItemRow, "created_at" | "updated_at">;
        Update: Partial<Omit<TimelineItemRow, "id" | "event_id" | "created_at">>;
      };
      wedding_info: {
        Row: WeddingInfoRow;
        Insert: WeddingInfoRow;
        Update: Partial<Omit<WeddingInfoRow, "event_id">>;
      };
      budget_entries: {
        Row: BudgetEntryRow;
        Insert: Omit<BudgetEntryRow, "created_at">;
        Update: Partial<Omit<BudgetEntryRow, "id" | "event_id" | "created_at">>;
      };
      rsvp_log: {
        Row: RsvpLogRow;
        Insert: Omit<RsvpLogRow, "id">;
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_guest_stats: {
        Args: { p_event_id: string };
        Returns: {
          total: number;
          confirmed: number;
          declined: number;
          pending: number;
          maybe: number;
          seated: number;
        };
      };
    };
    Enums: {
      guest_status: "pending" | "confirmed" | "declined" | "maybe";
      guest_side: "groom" | "bride" | "mutual";
      meal_type: "regular" | "vegetarian" | "vegan" | "gluten_free" | "kosher";
      table_shape: "round" | "rect";
    };
  };
}
