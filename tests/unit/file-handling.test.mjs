/**
 * tests/unit/file-handling.test.mjs — Phase 4.2 File Handling API (Sprint 22)
 *
 * Validates that:
 * - manifest.json has file_handlers for CSV/XLS/XLSX
 * - launchFile custom event shape is correct
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const MANIFEST_PATH = join(process.cwd(), "public/manifest.json");

describe("manifest.json — file_handlers", () => {
  let manifest;

  it("parses without error", () => {
    const raw = readFileSync(MANIFEST_PATH, "utf8");
    manifest = JSON.parse(raw);
    expect(manifest).toBeTruthy();
  });

  it("has file_handlers array", () => {
    const raw = readFileSync(MANIFEST_PATH, "utf8");
    manifest = JSON.parse(raw);
    expect(Array.isArray(manifest.file_handlers)).toBe(true);
    expect(manifest.file_handlers.length).toBeGreaterThan(0);
  });

  it("file_handler accepts .csv", () => {
    const raw = readFileSync(MANIFEST_PATH, "utf8");
    manifest = JSON.parse(raw);
    const handler = manifest.file_handlers[0];
    const allExts = Object.values(handler.accept).flat();
    expect(allExts).toContain(".csv");
  });

  it("file_handler accepts .xlsx", () => {
    const raw = readFileSync(MANIFEST_PATH, "utf8");
    manifest = JSON.parse(raw);
    const handler = manifest.file_handlers[0];
    const allExts = Object.values(handler.accept).flat();
    expect(allExts).toContain(".xlsx");
  });

  it("file_handler action points to index.html", () => {
    const raw = readFileSync(MANIFEST_PATH, "utf8");
    manifest = JSON.parse(raw);
    expect(manifest.file_handlers[0].action).toMatch(/index\.html/);
  });

  it("file_handler uses single-client launch_type", () => {
    const raw = readFileSync(MANIFEST_PATH, "utf8");
    manifest = JSON.parse(raw);
    expect(manifest.file_handlers[0].launch_type).toBe("single-client");
  });
});

describe("launchFile event — shape", () => {
  it("dispatches CustomEvent with a file detail", () => {
    const file = new File(["name,phone\nAlice,0541234567"], "guests.csv", { type: "text/csv" });
    const event = new CustomEvent("launchFile", { detail: { file } });
    expect(event.detail.file).toBe(file);
    expect(event.detail.file.name).toBe("guests.csv");
  });
});
