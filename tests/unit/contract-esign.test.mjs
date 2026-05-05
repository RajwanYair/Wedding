// tests/unit/contract-esign.test.mjs — S639 Contract e-sign lifecycle
import { describe, it, expect, beforeEach } from "vitest";
import {
  createSigningIntent,
  resetIdCounter,
  markViewed,
  signContract,
  declineContract,
  expireIntent,
  verifySignature,
  createAuditEntry,
  signingProgress,
} from "../../src/utils/contract-esign.js";

beforeEach(() => resetIdCounter());

describe("contract-esign", () => {
  describe("createSigningIntent", () => {
    it("creates a pending intent", () => {
      const i = createSigningIntent("c1", "vendor@test.com", "Vendor A");
      expect(i.id).toBe("esign_1");
      expect(i.contractId).toBe("c1");
      expect(i.signerEmail).toBe("vendor@test.com");
      expect(i.status).toBe("pending");
    });
    it("lowercases email", () => {
      expect(createSigningIntent("c1", "  X@Y.COM  ", "A").signerEmail).toBe("x@y.com");
    });
    it("defaults name to Unknown", () => {
      expect(createSigningIntent("c1", "x@y.com", "").signerName).toBe("Unknown");
    });
  });

  describe("markViewed", () => {
    it("transitions pending to viewed", () => {
      const i = createSigningIntent("c1", "x@y.com", "A");
      expect(markViewed(i).status).toBe("viewed");
    });
    it("no-op for signed", () => {
      const i = signContract(createSigningIntent("c1", "x@y.com", "A"), "content");
      expect(markViewed(i).status).toBe("signed");
    });
  });

  describe("signContract", () => {
    it("transitions to signed with hash", () => {
      const i = createSigningIntent("c1", "x@y.com", "A");
      const signed = signContract(i, "contract body");
      expect(signed.status).toBe("signed");
      expect(signed.signedAt).toBeDefined();
      expect(signed.signatureHash).toBeDefined();
    });
    it("signs viewed intent", () => {
      const viewed = markViewed(createSigningIntent("c1", "x@y.com", "A"));
      expect(signContract(viewed, "body").status).toBe("signed");
    });
    it("no-op for declined", () => {
      const declined = declineContract(createSigningIntent("c1", "x@y.com", "A"));
      expect(signContract(declined, "body").status).toBe("declined");
    });
  });

  describe("declineContract", () => {
    it("declines with reason", () => {
      const i = createSigningIntent("c1", "x@y.com", "A");
      const d = declineContract(i, "Too expensive");
      expect(d.status).toBe("declined");
      expect(d.declineReason).toBe("Too expensive");
    });
    it("no-op for signed", () => {
      const signed = signContract(createSigningIntent("c1", "x@y.com", "A"), "body");
      expect(declineContract(signed).status).toBe("signed");
    });
  });

  describe("expireIntent", () => {
    it("expires pending", () => {
      expect(expireIntent(createSigningIntent("c1", "x@y.com", "A")).status).toBe("expired");
    });
    it("no-op for signed", () => {
      const signed = signContract(createSigningIntent("c1", "x@y.com", "A"), "body");
      expect(expireIntent(signed).status).toBe("signed");
    });
  });

  describe("verifySignature", () => {
    it("verifies valid signature", () => {
      const i = createSigningIntent("c1", "x@y.com", "A");
      const signed = signContract(i, "contract body");
      expect(verifySignature("contract body", signed.signerEmail, signed.signedAt, signed.signatureHash)).toBe(true);
    });
    it("rejects tampered content", () => {
      const i = createSigningIntent("c1", "x@y.com", "A");
      const signed = signContract(i, "contract body");
      expect(verifySignature("tampered body", signed.signerEmail, signed.signedAt, signed.signatureHash)).toBe(false);
    });
  });

  describe("createAuditEntry", () => {
    it("creates entry with ip and ua", () => {
      const e = createAuditEntry("esign_1", "signed", "1.2.3.4", "Mozilla/5.0");
      expect(e.intentId).toBe("esign_1");
      expect(e.action).toBe("signed");
      expect(e.ip).toBe("1.2.3.4");
    });
    it("omits optional fields", () => {
      const e = createAuditEntry("esign_1", "viewed");
      expect(e.ip).toBeUndefined();
      expect(e.userAgent).toBeUndefined();
    });
  });

  describe("signingProgress", () => {
    it("computes correct stats", () => {
      const intents = [
        signContract(createSigningIntent("c1", "a@b.com", "A"), "body"),
        createSigningIntent("c1", "b@c.com", "B"),
        declineContract(createSigningIntent("c1", "c@d.com", "C")),
      ];
      const p = signingProgress(intents);
      expect(p.total).toBe(3);
      expect(p.signed).toBe(1);
      expect(p.pending).toBe(1);
      expect(p.declined).toBe(1);
      expect(p.rate).toBe(33);
    });
    it("handles empty", () => {
      expect(signingProgress([]).rate).toBe(0);
    });
  });
});
