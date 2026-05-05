/**
 * src/core/app-types.ts — TypeScript-first utility types and branded primitives.
 *
 * This is the first TypeScript implementation file (S674).  It augments
 * `src/types.d.ts` (data models) with generic utility types, branded ID
 * types, and Result/Maybe patterns for safer error handling.
 *
 * Import: `import type { Result, Maybe, GuestId } from './app-types.js';`
 */

// ── Result / Maybe ────────────────────────────────────────────────────────

/** Discriminated union for fallible operations. */
export type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/** Shorthand for `T | null | undefined`. */
export type Maybe<T> = T | null | undefined;

/** Convenience constructors. */
export const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const Err = <E = string>(error: E): Result<never, E> => ({ ok: false, error });

// ── Branded ID types ──────────────────────────────────────────────────────

/** Nominal branding helper — prevents accidental ID mixing. */
type Brand<B> = { readonly __brand: B };
export type Branded<T, B> = T & Brand<B>;

export type GuestId = Branded<string, "GuestId">;
export type TableId = Branded<string, "TableId">;
export type VendorId = Branded<string, "VendorId">;
export type ExpenseId = Branded<string, "ExpenseId">;
export type EventId = Branded<string, "EventId">;

/** Cast an arbitrary string into a typed ID (use at trust boundaries only). */
export const asGuestId = (id: string): GuestId => id as GuestId;
export const asTableId = (id: string): TableId => id as TableId;
export const asVendorId = (id: string): VendorId => id as VendorId;
export const asExpenseId = (id: string): ExpenseId => id as ExpenseId;
export const asEventId = (id: string): EventId => id as EventId;

// ── Utility mapped types ──────────────────────────────────────────────────

/** Make a subset of keys optional. */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Make a subset of keys required. */
export type RequireBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/** Recursive partial — useful for patch/update payloads. */
export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

/** Recursive readonly. */
export type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends object
    ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
    : T;

// ── Non-empty array helper ────────────────────────────────────────────────

/** An array guaranteed to have at least one element. */
export type NonEmptyArray<T> = [T, ...T[]];

export function isNonEmpty<T>(arr: T[]): arr is NonEmptyArray<T> {
  return arr.length > 0;
}

// ── Type guards ───────────────────────────────────────────────────────────

/** Narrows `unknown` to `Record<string, unknown>`. */
export function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Narrows `unknown` to `string`. */
export function isString(v: unknown): v is string {
  return typeof v === "string";
}

/** Narrows `unknown` to `number`. */
export function isNumber(v: unknown): v is number {
  return typeof v === "number" && !Number.isNaN(v);
}

// ── Exhaustiveness check ──────────────────────────────────────────────────

/**
 * Use in the `default` branch of a switch on a discriminated union to get
 * a compile-time error if a variant is unhandled.
 */
export function assertNever(x: never, msg?: string): never {
  throw new Error(msg ?? `Unexpected value: ${String(x)}`);
}
