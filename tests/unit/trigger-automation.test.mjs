import { describe, it, expect, beforeEach } from "vitest";
import {
  createTrigger,
  toggleTrigger,
  evaluateConditions,
  findMatchingTriggers,
  executeTriggers,
  createErrorLog,
  executionSummary,
  groupByEvent,
  resetCounters,
} from "../../src/utils/trigger-automation.js";

describe("trigger-automation", () => {
  beforeEach(() => resetCounters());

  describe("createTrigger", () => {
    it("creates a trigger with sequential ID", () => {
      const t = createTrigger("rsvp.confirmed", "whatsapp.send", { side: "bride" }, { template: "thanks" });
      expect(t.id).toBe("trig_1");
      expect(t.event).toBe("rsvp.confirmed");
      expect(t.action).toBe("whatsapp.send");
      expect(t.conditions).toEqual({ side: "bride" });
      expect(t.actionParams).toEqual({ template: "thanks" });
      expect(t.enabled).toBe(true);
    });

    it("increments IDs", () => {
      createTrigger("a", "b");
      const t2 = createTrigger("c", "d");
      expect(t2.id).toBe("trig_2");
    });
  });

  describe("toggleTrigger", () => {
    it("toggles enabled state", () => {
      const t = createTrigger("rsvp.confirmed", "whatsapp.send");
      expect(t.enabled).toBe(true);
      const toggled = toggleTrigger(t);
      expect(toggled.enabled).toBe(false);
      expect(toggleTrigger(toggled).enabled).toBe(true);
    });

    it("handles null", () => {
      expect(toggleTrigger(null)).toBeNull();
    });
  });

  describe("evaluateConditions", () => {
    it("returns true when all conditions match", () => {
      const t = createTrigger("rsvp.confirmed", "x", { side: "bride", status: "confirmed" });
      expect(evaluateConditions(t, { side: "bride", status: "confirmed", extra: true })).toBe(true);
    });

    it("returns false when a condition does not match", () => {
      const t = createTrigger("rsvp.confirmed", "x", { side: "groom" });
      expect(evaluateConditions(t, { side: "bride" })).toBe(false);
    });

    it("returns true when trigger has no conditions", () => {
      const t = createTrigger("rsvp.confirmed", "x");
      expect(evaluateConditions(t, {})).toBe(true);
    });
  });

  describe("findMatchingTriggers", () => {
    it("finds enabled triggers matching event", () => {
      const t1 = createTrigger("rsvp.confirmed", "whatsapp.send");
      const t2 = createTrigger("payment.received", "email.send");
      const t3 = createTrigger("rsvp.confirmed", "email.send");
      const disabled = toggleTrigger(createTrigger("rsvp.confirmed", "webhook.fire"));

      const matches = findMatchingTriggers([t1, t2, t3, disabled], "rsvp.confirmed");
      expect(matches).toHaveLength(2);
      expect(matches[0].id).toBe(t1.id);
      expect(matches[1].id).toBe(t3.id);
    });

    it("returns empty for non-array", () => {
      expect(findMatchingTriggers(null, "rsvp.confirmed")).toEqual([]);
    });
  });

  describe("executeTriggers", () => {
    it("returns success logs for matching conditions", () => {
      const t = createTrigger("rsvp.confirmed", "whatsapp.send", { side: "bride" });
      const logs = executeTriggers([t], "rsvp.confirmed", { side: "bride" });
      expect(logs).toHaveLength(1);
      expect(logs[0].result).toBe("success");
      expect(logs[0].triggerId).toBe(t.id);
    });

    it("returns skipped logs for non-matching conditions", () => {
      const t = createTrigger("rsvp.confirmed", "whatsapp.send", { side: "groom" });
      const logs = executeTriggers([t], "rsvp.confirmed", { side: "bride" });
      expect(logs).toHaveLength(1);
      expect(logs[0].result).toBe("skipped");
    });

    it("returns empty for non-matching event", () => {
      const t = createTrigger("payment.received", "email.send");
      const logs = executeTriggers([t], "rsvp.confirmed", {});
      expect(logs).toHaveLength(0);
    });
  });

  describe("createErrorLog", () => {
    it("creates error execution log", () => {
      const log = createErrorLog("trig_1", "rsvp.confirmed", "Network error");
      expect(log.result).toBe("error");
      expect(log.error).toBe("Network error");
      expect(log.triggerId).toBe("trig_1");
    });
  });

  describe("executionSummary", () => {
    it("summarizes execution results", () => {
      const logs = [
        { result: "success" }, { result: "success" },
        { result: "skipped" }, { result: "error" },
      ];
      expect(executionSummary(logs)).toEqual({ total: 4, success: 2, skipped: 1, errors: 1 });
    });

    it("returns zeros for non-array", () => {
      expect(executionSummary(null)).toEqual({ total: 0, success: 0, skipped: 0, errors: 0 });
    });
  });

  describe("groupByEvent", () => {
    it("groups triggers by event name", () => {
      const t1 = createTrigger("rsvp.confirmed", "a");
      const t2 = createTrigger("payment.received", "b");
      const t3 = createTrigger("rsvp.confirmed", "c");
      const groups = groupByEvent([t1, t2, t3]);
      expect(Object.keys(groups)).toHaveLength(2);
      expect(groups["rsvp.confirmed"]).toHaveLength(2);
      expect(groups["payment.received"]).toHaveLength(1);
    });

    it("returns empty object for non-array", () => {
      expect(groupByEvent(null)).toEqual({});
    });
  });
});
