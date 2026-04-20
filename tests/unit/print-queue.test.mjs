import { describe, it, expect } from "vitest";
import {
  PRINT_TYPES,
  PRINT_STATUS,
  createPrintJob,
  buildPrintQueue,
  sortPrintQueue,
  chunkPrintQueue,
  estimatePrintTime,
  summarizePrintQueue,
  filterPrintJobsByType,
  getPrintJobsByGuest,
} from "../../src/utils/print-queue.js";

// ── Constants ─────────────────────────────────────────────────────────────

describe("PRINT_TYPES", () => {
  it("is frozen", () => expect(Object.isFrozen(PRINT_TYPES)).toBe(true));
  it("has expected types", () => {
    expect(PRINT_TYPES.PLACE_CARD).toBe("place_card");
    expect(PRINT_TYPES.INVITATION).toBe("invitation");
    expect(PRINT_TYPES.TABLE_SIGN).toBe("table_sign");
  });
});

describe("PRINT_STATUS", () => {
  it("is frozen", () => expect(Object.isFrozen(PRINT_STATUS)).toBe(true));
  it("has PENDING, DONE, ERROR", () => {
    expect(PRINT_STATUS.PENDING).toBe("pending");
    expect(PRINT_STATUS.DONE).toBe("done");
    expect(PRINT_STATUS.ERROR).toBe("error");
  });
});

// ── createPrintJob ────────────────────────────────────────────────────────

describe("createPrintJob()", () => {
  it("returns a job with correct shape", () => {
    const job = createPrintJob({ type: PRINT_TYPES.PLACE_CARD, guestId: "g1", guestName: "Noa" });
    expect(job.type).toBe(PRINT_TYPES.PLACE_CARD);
    expect(job.guestId).toBe("g1");
    expect(job.guestName).toBe("Noa");
    expect(job.status).toBe(PRINT_STATUS.PENDING);
    expect(job.copies).toBe(1);
    expect(job.id).toMatch(/^pj_/);
    expect(job.createdAt).toBeDefined();
  });

  it("throws for unknown type", () => {
    expect(() => createPrintJob({ type: "unknown_type" })).toThrow();
  });

  it("throws for copies < 1", () => {
    expect(() => createPrintJob({ type: PRINT_TYPES.PLACE_CARD, copies: 0 })).toThrow();
  });

  it("accepts multiple copies", () => {
    const job = createPrintJob({ type: PRINT_TYPES.INVITATION, copies: 3 });
    expect(job.copies).toBe(3);
  });

  it("accepts priority", () => {
    const job = createPrintJob({ type: PRINT_TYPES.TABLE_SIGN, priority: 10 });
    expect(job.priority).toBe(10);
  });
});

// ── buildPrintQueue ───────────────────────────────────────────────────────

describe("buildPrintQueue()", () => {
  it("returns empty for non-array", () => expect(buildPrintQueue(null)).toEqual([]));

  it("deduplicates by guestId+type", () => {
    const jobs = [
      { id: "1", type: PRINT_TYPES.PLACE_CARD, guestId: "g1", status: PRINT_STATUS.PENDING },
      { id: "2", type: PRINT_TYPES.PLACE_CARD, guestId: "g1", status: PRINT_STATUS.PENDING },
    ];
    expect(buildPrintQueue(jobs)).toHaveLength(1);
  });

  it("keeps distinct guest jobs", () => {
    const jobs = [
      { id: "1", type: PRINT_TYPES.PLACE_CARD, guestId: "g1" },
      { id: "2", type: PRINT_TYPES.PLACE_CARD, guestId: "g2" },
    ];
    expect(buildPrintQueue(jobs)).toHaveLength(2);
  });

  it("keeps last duplicate", () => {
    const jobs = [
      { id: "1", type: PRINT_TYPES.PLACE_CARD, guestId: "g1", status: PRINT_STATUS.PENDING },
      { id: "2", type: PRINT_TYPES.PLACE_CARD, guestId: "g1", status: PRINT_STATUS.DONE },
    ];
    const result = buildPrintQueue(jobs);
    expect(result[0].status).toBe(PRINT_STATUS.DONE);
  });
});

// ── sortPrintQueue ────────────────────────────────────────────────────────

describe("sortPrintQueue()", () => {
  it("returns empty for non-array", () => expect(sortPrintQueue(null)).toEqual([]));

  it("sorts by priority descending", () => {
    const jobs = [
      { id: "a", type: "t", priority: 1, createdAt: "2024-01-01T00:00:00.000Z" },
      { id: "b", type: "t", priority: 5, createdAt: "2024-01-01T00:00:00.000Z" },
      { id: "c", type: "t", priority: 3, createdAt: "2024-01-01T00:00:00.000Z" },
    ];
    const sorted = sortPrintQueue(jobs);
    expect(sorted[0].id).toBe("b");
    expect(sorted[1].id).toBe("c");
    expect(sorted[2].id).toBe("a");
  });

  it("does not mutate original array", () => {
    const jobs = [{ id: "x", priority: 2, createdAt: "2024-01-01T00:00:00.000Z" }];
    const sorted = sortPrintQueue(jobs);
    expect(sorted).not.toBe(jobs);
  });

  it("sorts by createdAt when priority equal", () => {
    const jobs = [
      { id: "b", priority: 0, createdAt: "2024-01-02T00:00:00.000Z" },
      { id: "a", priority: 0, createdAt: "2024-01-01T00:00:00.000Z" },
    ];
    expect(sortPrintQueue(jobs)[0].id).toBe("a");
  });
});

// ── chunkPrintQueue ───────────────────────────────────────────────────────

describe("chunkPrintQueue()", () => {
  it("returns empty for empty array", () => expect(chunkPrintQueue([])).toEqual([]));
  it("returns empty for non-array", () => expect(chunkPrintQueue(null)).toEqual([]));

  it("splits into chunks", () => {
    const jobs = Array.from({ length: 10 }, (_, i) => ({ id: String(i) }));
    const chunks = chunkPrintQueue(jobs, 3);
    expect(chunks).toHaveLength(4);
    expect(chunks[0]).toHaveLength(3);
    expect(chunks[3]).toHaveLength(1);
  });

  it("single chunk when size >= length", () => {
    const jobs = Array.from({ length: 5 }, (_, i) => ({ id: String(i) }));
    expect(chunkPrintQueue(jobs, 100)).toHaveLength(1);
  });
});

// ── estimatePrintTime ─────────────────────────────────────────────────────

describe("estimatePrintTime()", () => {
  it("returns 0 for empty", () => expect(estimatePrintTime([])).toBe(0));
  it("returns 0 for non-array", () => expect(estimatePrintTime(null)).toBe(0));

  it("estimates place_card at 10s each", () => {
    const jobs = [{ type: PRINT_TYPES.PLACE_CARD, copies: 2 }];
    expect(estimatePrintTime(jobs)).toBe(20);
  });

  it("estimates invitation at 45s each", () => {
    const jobs = [{ type: PRINT_TYPES.INVITATION, copies: 1 }];
    expect(estimatePrintTime(jobs)).toBe(45);
  });

  it("sums multiple jobs", () => {
    const jobs = [
      { type: PRINT_TYPES.PLACE_CARD, copies: 1 },   // 10s
      { type: PRINT_TYPES.TABLE_SIGN, copies: 1 },    // 30s
    ];
    expect(estimatePrintTime(jobs)).toBe(40);
  });
});

// ── summarizePrintQueue ───────────────────────────────────────────────────

describe("summarizePrintQueue()", () => {
  it("returns zero summary for null", () => {
    const s = summarizePrintQueue(null);
    expect(s.total).toBe(0);
  });

  it("counts by type", () => {
    const jobs = [
      { type: PRINT_TYPES.PLACE_CARD, status: PRINT_STATUS.PENDING, copies: 1 },
      { type: PRINT_TYPES.PLACE_CARD, status: PRINT_STATUS.DONE, copies: 1 },
      { type: PRINT_TYPES.INVITATION, status: PRINT_STATUS.PENDING, copies: 1 },
    ];
    const s = summarizePrintQueue(jobs);
    expect(s.total).toBe(3);
    expect(s.byType[PRINT_TYPES.PLACE_CARD]).toBe(2);
    expect(s.byType[PRINT_TYPES.INVITATION]).toBe(1);
  });

  it("counts by status", () => {
    const jobs = [
      { type: PRINT_TYPES.PLACE_CARD, status: PRINT_STATUS.PENDING, copies: 1 },
      { type: PRINT_TYPES.PLACE_CARD, status: PRINT_STATUS.DONE, copies: 1 },
    ];
    const s = summarizePrintQueue(jobs);
    expect(s.byStatus[PRINT_STATUS.PENDING]).toBe(1);
    expect(s.byStatus[PRINT_STATUS.DONE]).toBe(1);
  });
});

// ── filterPrintJobsByType ─────────────────────────────────────────────────

describe("filterPrintJobsByType()", () => {
  const jobs = [
    { type: PRINT_TYPES.PLACE_CARD },
    { type: PRINT_TYPES.INVITATION },
    { type: PRINT_TYPES.PLACE_CARD },
  ];

  it("filters to matching type", () => {
    const result = filterPrintJobsByType(jobs, PRINT_TYPES.PLACE_CARD);
    expect(result).toHaveLength(2);
  });

  it("returns empty when no matches", () => {
    expect(filterPrintJobsByType(jobs, PRINT_TYPES.TABLE_SIGN)).toHaveLength(0);
  });

  it("returns empty for non-array", () => {
    expect(filterPrintJobsByType(null, PRINT_TYPES.PLACE_CARD)).toEqual([]);
  });
});

// ── getPrintJobsByGuest ───────────────────────────────────────────────────

describe("getPrintJobsByGuest()", () => {
  const jobs = [
    { guestId: "g1", type: PRINT_TYPES.PLACE_CARD },
    { guestId: "g1", type: PRINT_TYPES.INVITATION },
    { guestId: "g2", type: PRINT_TYPES.PLACE_CARD },
  ];

  it("returns jobs for a specific guest", () => {
    expect(getPrintJobsByGuest(jobs, "g1")).toHaveLength(2);
  });

  it("returns empty for unknown guest", () => {
    expect(getPrintJobsByGuest(jobs, "g99")).toHaveLength(0);
  });

  it("returns empty for null guestId", () => {
    expect(getPrintJobsByGuest(jobs, null)).toEqual([]);
  });

  it("returns empty for non-array", () => {
    expect(getPrintJobsByGuest(null, "g1")).toEqual([]);
  });
});
