/**
 * tests/unit/photo-gallery.test.mjs — S115 photo gallery stub.
 */
import { describe, it, expect, vi } from "vitest";
import {
  validatePhoto,
  buildPhotoKey,
  uploadPhoto,
  MAX_UPLOAD_BYTES,
} from "../../src/services/photo-gallery.js";

describe("S115 — photo-gallery", () => {
  it("validatePhoto accepts jpg/png/webp/heic/avif", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp", "image/heic", "image/avif"]) {
      expect(validatePhoto({ name: "x", type, size: 100 }).ok).toBe(true);
    }
  });

  it("validatePhoto rejects unsupported mime", () => {
    expect(validatePhoto({ type: "application/pdf", size: 1 })).toEqual({
      ok: false,
      reason: "unsupported_mime",
    });
  });

  it("validatePhoto rejects empty / oversize files", () => {
    expect(validatePhoto({ type: "image/png", size: 0 }).reason).toBe("empty_file");
    expect(
      validatePhoto({ type: "image/png", size: MAX_UPLOAD_BYTES + 1 }).reason,
    ).toBe("too_large");
  });

  it("buildPhotoKey sanitises filename and zero-pads month", () => {
    const k = buildPhotoKey({
      eventId: "e1",
      uploaderId: "u1",
      filename: "מסיבה!! party.jpg",
      now: new Date(Date.UTC(2026, 2, 5)), // March
    });
    expect(k).toMatch(/^events\/e1\/2026\/03\/u1__/);
    expect(k.endsWith(".jpg")).toBe(true);
  });

  it("buildPhotoKey throws on missing args", () => {
    expect(() =>
      buildPhotoKey({ eventId: "", uploaderId: "u", filename: "f" }),
    ).toThrow();
  });

  it("uploadPhoto returns key on success", async () => {
    const client = {
      upload: vi.fn().mockResolvedValue({ data: { path: "ok" } }),
    };
    const r = await uploadPhoto(
      { name: "p.jpg", type: "image/jpeg", size: 100 },
      { eventId: "e1", uploaderId: "u1" },
      client,
    );
    expect(r.ok).toBe(true);
    expect(r.key).toContain("events/e1/");
    expect(client.upload).toHaveBeenCalledOnce();
  });

  it("uploadPhoto surfaces validation error before calling client", async () => {
    const client = { upload: vi.fn() };
    const r = await uploadPhoto(
      { name: "p.pdf", type: "application/pdf", size: 1 },
      { eventId: "e1", uploaderId: "u1" },
      client,
    );
    expect(r.ok).toBe(false);
    expect(client.upload).not.toHaveBeenCalled();
  });

  it("uploadPhoto reports no_client when client missing", async () => {
    const r = await uploadPhoto(
      { name: "p.jpg", type: "image/jpeg", size: 100 },
      { eventId: "e1", uploaderId: "u1" },
      /** @type {any} */ (null),
    );
    expect(r.error).toBe("no_client");
  });

  it("uploadPhoto surfaces client error", async () => {
    const client = {
      upload: vi.fn().mockResolvedValue({ error: { message: "denied" } }),
    };
    const r = await uploadPhoto(
      { name: "p.jpg", type: "image/jpeg", size: 100 },
      { eventId: "e1", uploaderId: "u1" },
      client,
    );
    expect(r.error).toBe("denied");
  });
});
