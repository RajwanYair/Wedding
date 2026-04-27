/**
 * @file sw-background-sync.test.mjs
 * Sprint 59 — B4: Service Worker Background Sync queue logic
 *
 * Verifies that:
 *  1. The SW exposes the expected sync tags as constants.
 *  2. The QUEUE_SYNC message type string is declared correctly.
 *  3. The SW source includes IndexedDB helpers (openSyncDb, idbGetAll, idbDelete).
 *  4. The sync event handler covers both "rsvp-sync" and "write-sync" tags.
 *  5. The message handler supports both "SKIP_WAITING" and "QUEUE_SYNC".
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const swPath = path.resolve(__dirname, "../../public/sw.js");
const SW_SRC = readFileSync(swPath, "utf8");

describe("Service Worker — Background Sync (B4)", () => {
  it("declares RSVP_SYNC_TAG constant", () => {
    expect(SW_SRC).toContain('const RSVP_SYNC_TAG = "rsvp-sync"');
  });

  it("declares WRITE_SYNC_TAG constant", () => {
    expect(SW_SRC).toContain('const WRITE_SYNC_TAG = "write-sync"');
  });

  it("registers sync event listener", () => {
    expect(SW_SRC).toContain('self.addEventListener("sync"');
  });

  it("sync handler handles rsvp-sync tag", () => {
    expect(SW_SRC).toContain("RSVP_SYNC_TAG");
    expect(SW_SRC).toContain("e.tag === RSVP_SYNC_TAG");
  });

  it("sync handler handles write-sync tag", () => {
    expect(SW_SRC).toContain("WRITE_SYNC_TAG");
    expect(SW_SRC).toContain("e.tag === WRITE_SYNC_TAG");
  });

  it("calls e.waitUntil in sync handler", () => {
    const syncBlock = SW_SRC.slice(SW_SRC.indexOf("sync", SW_SRC.indexOf("flush")));
    expect(SW_SRC).toContain("e.waitUntil(flushQueue(e.tag))");
  });

  it("defines IndexedDB store name constant", () => {
    expect(SW_SRC).toContain('const IDB_STORE = "pending"');
  });

  it("defines IDB database name", () => {
    expect(SW_SRC).toContain('const IDB_NAME = "wedding-sync-queue"');
  });

  it("defines openSyncDb helper", () => {
    expect(SW_SRC).toContain("function openSyncDb()");
  });

  it("openSyncDb creates object store on upgrade", () => {
    expect(SW_SRC).toContain("onupgradeneeded");
    expect(SW_SRC).toContain("createObjectStore");
  });

  it("defines idbGetAll helper", () => {
    expect(SW_SRC).toContain("function idbGetAll(db)");
  });

  it("defines idbDelete helper", () => {
    expect(SW_SRC).toContain("function idbDelete(db, id)");
  });

  it("defines flushQueue helper", () => {
    expect(SW_SRC).toContain("function flushQueue(tag)");
  });

  it("flushQueue filters items by tag", () => {
    expect(SW_SRC).toContain("item.tag === tag");
  });

  it("flushQueue sends RSVP_SYNC_READY for rsvp-sync tag", () => {
    expect(SW_SRC).toContain("RSVP_SYNC_READY");
  });

  it("flushQueue sends WRITE_SYNC_READY for write-sync tag", () => {
    expect(SW_SRC).toContain("WRITE_SYNC_READY");
  });

  it("flushQueue deletes flushed items from IndexedDB", () => {
    expect(SW_SRC).toContain("idbDelete(db, item.id)");
  });

  it("message handler still supports SKIP_WAITING", () => {
    expect(SW_SRC).toContain('if (e.data === "SKIP_WAITING")');
    expect(SW_SRC).toContain("self.skipWaiting()");
  });

  it("message handler supports QUEUE_SYNC type", () => {
    expect(SW_SRC).toContain('e.data.type === "QUEUE_SYNC"');
  });

  it("QUEUE_SYNC stores payload in IndexedDB", () => {
    expect(SW_SRC).toContain("e.data.payload");
    expect(SW_SRC).toContain("tx.objectStore(IDB_STORE).add(");
  });

  it("QUEUE_SYNC uses tag from message or fallback", () => {
    expect(SW_SRC).toContain("e.data.tag || WRITE_SYNC_TAG");
  });

  it("QUEUE_SYNC stores timestamp", () => {
    expect(SW_SRC).toContain("ts: Date.now()");
  });

  it("openSyncDb uses IDB_VERSION 1", () => {
    expect(SW_SRC).toContain("const IDB_VERSION = 1");
  });

  it("uses autoIncrement key for IDB store", () => {
    expect(SW_SRC).toContain("autoIncrement: true");
  });
});
