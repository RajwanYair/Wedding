/**
 * tests/unit/drag-drop.test.mjs — Sprint 105
 */

import { describe, it, expect } from "vitest";
import { createDragDropState } from "../../src/utils/drag-drop.js";

describe("createDragDropState — startDrag / endDrag", () => {
  it("starts not dragging", () => {
    const dnd = createDragDropState();
    expect(dnd.isDragging()).toBe(false);
  });

  it("sets isDragging after startDrag", () => {
    const dnd = createDragDropState();
    dnd.startDrag({ type: "guest", id: "g1", sourceTableId: "t1" });
    expect(dnd.isDragging()).toBe(true);
  });

  it("records drag item", () => {
    const dnd = createDragDropState();
    dnd.startDrag({ type: "guest", id: "g42", sourceTableId: "t7" });
    expect(dnd.getDragItem()).toEqual({ type: "guest", id: "g42", sourceTableId: "t7" });
  });

  it("clears state after endDrag", () => {
    const dnd = createDragDropState();
    dnd.startDrag({ type: "guest", id: "g1", sourceTableId: "t1" });
    dnd.endDrag();
    expect(dnd.isDragging()).toBe(false);
    expect(dnd.getDragItem()).toEqual({ type: "none", id: null, sourceTableId: null });
  });

  it("defaults sourceTableId to null when omitted", () => {
    const dnd = createDragDropState();
    dnd.startDrag({ type: "guest", id: "g1" });
    expect(dnd.getDragItem().sourceTableId).toBeNull();
  });
});

describe("createDragDropState — hover target", () => {
  it("records hover target on enterDropTarget", () => {
    const dnd = createDragDropState();
    dnd.startDrag({ type: "guest", id: "g1", sourceTableId: "t1" });
    dnd.enterDropTarget("t2");
    expect(dnd.getHoverTarget()).toBe("t2");
  });

  it("clears hover target on leaveDropTarget", () => {
    const dnd = createDragDropState();
    dnd.startDrag({ type: "guest", id: "g1", sourceTableId: "t1" });
    dnd.enterDropTarget("t2");
    dnd.leaveDropTarget();
    expect(dnd.getHoverTarget()).toBeNull();
  });

  it("ignores enterDropTarget when not dragging", () => {
    const dnd = createDragDropState();
    dnd.enterDropTarget("t2");
    expect(dnd.getHoverTarget()).toBeNull();
  });
});

describe("createDragDropState — canDrop", () => {
  it("returns false for same table as source", () => {
    const dnd = createDragDropState();
    dnd.startDrag({ type: "guest", id: "g1", sourceTableId: "t1" });
    expect(dnd.canDrop("t1")).toBe(false);
  });

  it("returns true for different table", () => {
    const dnd = createDragDropState();
    dnd.startDrag({ type: "guest", id: "g1", sourceTableId: "t1" });
    expect(dnd.canDrop("t2")).toBe(true);
  });

  it("returns false when not dragging", () => {
    const dnd = createDragDropState();
    expect(dnd.canDrop("t1")).toBe(false);
  });
});

describe("createDragDropState — drop", () => {
  it("returns drop result on valid drop", () => {
    const dnd = createDragDropState();
    dnd.startDrag({ type: "guest", id: "g5", sourceTableId: "t1" });
    dnd.enterDropTarget("t3");
    const result = dnd.drop();
    expect(result).toEqual({ type: "guest", id: "g5", fromTableId: "t1", toTableId: "t3" });
  });

  it("returns null when dropping onto source table", () => {
    const dnd = createDragDropState();
    dnd.startDrag({ type: "guest", id: "g5", sourceTableId: "t1" });
    dnd.enterDropTarget("t1");
    expect(dnd.drop()).toBeNull();
  });

  it("returns null when no hover target", () => {
    const dnd = createDragDropState();
    dnd.startDrag({ type: "guest", id: "g5", sourceTableId: "t1" });
    expect(dnd.drop()).toBeNull();
  });

  it("clears drag state after successful drop", () => {
    const dnd = createDragDropState();
    dnd.startDrag({ type: "guest", id: "g5", sourceTableId: "t1" });
    dnd.enterDropTarget("t2");
    dnd.drop();
    expect(dnd.isDragging()).toBe(false);
  });
});
