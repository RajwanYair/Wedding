/**
 * tests/unit/vendor-proposals.test.mjs — Sprint 121
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { initStore } from "../../src/core/store.js";

vi.mock("../../src/services/sheets.js", () => ({ enqueueWrite: vi.fn() }));

const {
  createProposal, getProposal, listProposals, updateProposal,
  sendProposal, acceptProposal, declineProposal, expireProposal,
  deleteProposal, getProposalStats,
} = await import("../../src/services/vendor-proposals.js");

function seed() {
  initStore({
    vendorProposals: { value: [] },
    guests:          { value: [] },
    weddingInfo:     { value: {} },
  });
}

beforeEach(seed);

describe("createProposal", () => {
  it("returns an id", () => {
    const id = createProposal({ vendorId: "v1", title: "Photo", amount: 5000 });
    expect(typeof id).toBe("string");
  });

  it("creates draft status", () => {
    const id = createProposal({ vendorId: "v1", title: "Photo", amount: 5000 });
    expect(getProposal(id)?.status).toBe("draft");
  });

  it("throws on missing title", () => {
    expect(() => createProposal({ vendorId: "v1", title: "", amount: 0 })).toThrow();
  });

  it("throws on negative amount", () => {
    expect(() => createProposal({ vendorId: "v1", title: "DJ", amount: -1 })).toThrow();
  });
});

describe("listProposals / getProposal", () => {
  it("lists all proposals", () => {
    createProposal({ vendorId: "v1", title: "A", amount: 100 });
    createProposal({ vendorId: "v2", title: "B", amount: 200 });
    expect(listProposals()).toHaveLength(2);
  });

  it("filters by vendorId", () => {
    createProposal({ vendorId: "v1", title: "A", amount: 100 });
    createProposal({ vendorId: "v2", title: "B", amount: 200 });
    expect(listProposals({ vendorId: "v1" })).toHaveLength(1);
  });

  it("filters by status", () => {
    const id = createProposal({ vendorId: "v1", title: "A", amount: 100 });
    sendProposal(id);
    expect(listProposals({ status: "sent" })).toHaveLength(1);
    expect(listProposals({ status: "draft" })).toHaveLength(0);
  });
});

describe("updateProposal", () => {
  it("updates title on draft", () => {
    const id = createProposal({ vendorId: "v1", title: "Old", amount: 1 });
    updateProposal(id, { title: "New" });
    expect(getProposal(id)?.title).toBe("New");
  });

  it("throws when updating a sent proposal", () => {
    const id = createProposal({ vendorId: "v1", title: "A", amount: 1 });
    sendProposal(id);
    expect(() => updateProposal(id, { title: "X" })).toThrow();
  });
});

describe("status transitions", () => {
  it("sendProposal: draft → sent", () => {
    const id = createProposal({ vendorId: "v1", title: "A", amount: 1 });
    sendProposal(id);
    expect(getProposal(id)?.status).toBe("sent");
  });

  it("acceptProposal: sent → accepted", () => {
    const id = createProposal({ vendorId: "v1", title: "A", amount: 1 });
    sendProposal(id);
    acceptProposal(id);
    expect(getProposal(id)?.status).toBe("accepted");
  });

  it("declineProposal: sent → declined", () => {
    const id = createProposal({ vendorId: "v1", title: "A", amount: 1 });
    sendProposal(id);
    declineProposal(id);
    expect(getProposal(id)?.status).toBe("declined");
  });

  it("expireProposal: sent → expired", () => {
    const id = createProposal({ vendorId: "v1", title: "A", amount: 1 });
    sendProposal(id);
    expireProposal(id);
    expect(getProposal(id)?.status).toBe("expired");
  });

  it("deleteProposal removes entry", () => {
    const id = createProposal({ vendorId: "v1", title: "A", amount: 1 });
    deleteProposal(id);
    expect(getProposal(id)).toBeNull();
  });
});

describe("getProposalStats", () => {
  it("reflects correct counts", () => {
    const a = createProposal({ vendorId: "v1", title: "A", amount: 1 });
    const b = createProposal({ vendorId: "v1", title: "B", amount: 1 });
    sendProposal(a);
    acceptProposal(a);
    sendProposal(b);
    const stats = getProposalStats();
    expect(stats.total).toBe(2);
    expect(stats.accepted).toBe(1);
    expect(stats.sent).toBe(1);
    expect(stats.draft).toBe(0);
  });
});
