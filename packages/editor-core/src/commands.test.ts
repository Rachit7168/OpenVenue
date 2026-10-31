import { polygonArea } from "@openvenue/geometry";
import {
  createEmptyVenue,
  validateVenue,
  type SceneObject,
  type VenueDocument,
} from "@openvenue/scene-schema";
import { describe, expect, it } from "vitest";
import {
  addObject,
  addRoom,
  addWall,
  groupCommands,
  CommandError,
  CommandStack,
  deleteObject,
  moveObject,
  planRectangularRoom,
  resizeObject,
  rotateObject,
  updateMaterial,
  updateWall,
  type EditorCommand,
} from "./index.js";

const floorOf = (document: VenueDocument) => {
  const floor = document.venue.floors[0];
  if (!floor) {
    throw new Error("missing floor");
  }
  return floor;
};

function chair(id: string): SceneObject {
  return {
    id,
    type: "chair",
    name: "Chair",
    transform: {
      position: { x: 1, y: 0, z: 2 },
      rotation: { x: 0, y: 0, z: 0 },
    },
    dimensions: { width: 0.5, height: 0.9, depth: 0.5 },
  };
}

function apply(document: VenueDocument, command: Parameters<CommandStack["execute"]>[1]) {
  const stack = new CommandStack();
  const changed = stack.execute(document, command);
  const undone = stack.undo(changed);
  expect(JSON.stringify(undone)).toBe(JSON.stringify(document));
  const redone = stack.redo(undone);
  expect(JSON.stringify(redone)).toBe(JSON.stringify(changed));
  return { stack, changed };
}

describe("commands", () => {
  const objectId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

  it("undoes and redoes every command back to the same document", () => {
    let document = createEmptyVenue();
    const floorId = floorOf(document).id;
    document = apply(document, addObject(floorId, chair(objectId))).changed;

    const moved = apply(document, moveObject(document, objectId, { x: 4, y: 0, z: 1 })).changed;
    const object = floorOf(moved).objects[0];
    expect(object?.transform.position).toEqual({ x: 4, y: 0, z: 1 });

    const rotated = apply(moved, rotateObject(moved, objectId, { x: 0, y: 1.2, z: 0 })).changed;
    expect(floorOf(rotated).objects[0]?.transform.rotation.y).toBeCloseTo(1.2);

    const resized = apply(
      rotated,
      resizeObject(rotated, objectId, { width: 1, height: 1, depth: 1 }),
    ).changed;
    expect(floorOf(resized).objects[0]?.dimensions).toEqual({ width: 1, height: 1, depth: 1 });

    const removed = apply(resized, deleteObject(resized, objectId)).changed;
    expect(floorOf(removed).objects).toHaveLength(0);

    const wall = {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      start: { x: 0, z: 0 },
      end: { x: 5, z: 0 },
      thickness: 0.2,
      height: 3,
    };
    const withWall = apply(document, addWall(floorId, wall)).changed;
    const updated = apply(
      withWall,
      updateWall(withWall, wall.id, { ...wall, end: { x: 8, z: 0 } }),
    ).changed;
    expect(floorOf(updated).walls[0]?.end).toEqual({ x: 8, z: 0 });

    const room = {
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      name: "Hall",
      boundary: [
        { x: 0, z: 0 },
        { x: 5, z: 0 },
        { x: 5, z: 4 },
      ] as [{ x: number; z: number }, { x: number; z: number }, { x: number; z: number }],
    };
    const withRoom = apply(document, addRoom(floorId, room)).changed;
    const painted = apply(withRoom, updateMaterial(withRoom, room.id, "oak")).changed;
    expect(floorOf(painted).rooms[0]?.floorMaterial).toBe("oak");
  });

  it("merges drags of the same object into one undo step", () => {
    let document = createEmptyVenue();
    const floorId = floorOf(document).id;
    const stack = new CommandStack();
    document = stack.execute(document, addObject(floorId, chair(objectId)));
    document = stack.execute(document, moveObject(document, objectId, { x: 2, y: 0, z: 0 }));
    document = stack.execute(document, moveObject(document, objectId, { x: 6, y: 0, z: 0 }), {
      merge: true,
    });
    expect(floorOf(document).objects[0]?.transform.position).toEqual({ x: 6, y: 0, z: 0 });

    document = stack.undo(document);
    expect(floorOf(document).objects[0]?.transform.position).toEqual({ x: 1, y: 0, z: 2 });
    expect(stack.canUndo).toBe(true);

    document = stack.redo(document);
    expect(floorOf(document).objects[0]?.transform.position).toEqual({ x: 6, y: 0, z: 0 });
  });

  it("does not merge drags of different objects", () => {
    let document = createEmptyVenue();
    const floorId = floorOf(document).id;
    const otherId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const stack = new CommandStack();
    document = stack.execute(document, addObject(floorId, chair(objectId)));
    document = stack.execute(document, addObject(floorId, chair(otherId)));
    document = stack.execute(document, moveObject(document, objectId, { x: 3, y: 0, z: 0 }));
    document = stack.execute(document, moveObject(document, otherId, { x: 4, y: 0, z: 0 }), {
      merge: true,
    });
    document = stack.undo(document);
    expect(floorOf(document).objects[0]?.transform.position.x).toBe(3);
    expect(floorOf(document).objects[1]?.transform.position).toEqual({ x: 1, y: 0, z: 2 });
  });

  it("builds a room from code, then undo and redo restore the same document", () => {
    const document = createEmptyVenue();
    const floorId = floorOf(document).id;
    const planned = planRectangularRoom({
      name: "Hall",
      width: 10,
      depth: 8,
      roomId: "99999999-9999-4999-8999-999999999999",
      wallIds: [
        "55555555-5555-4555-8555-555555555555",
        "66666666-6666-4666-8666-666666666666",
        "77777777-7777-4777-8777-777777777777",
        "88888888-8888-4888-8888-888888888888",
      ],
    });
    expect(planned.area).toBeCloseTo(80);
    expect(polygonArea(planned.room.boundary)).toBeCloseTo(80);

    const stack = new CommandStack();
    let current = document;
    for (const wall of planned.walls) {
      current = stack.execute(current, addWall(floorId, wall));
    }
    current = stack.execute(current, addRoom(floorId, planned.room));
    expect(validateVenue(current).valid).toBe(true);
    const built = JSON.stringify(current);

    while (stack.canUndo) {
      current = stack.undo(current);
    }
    expect(floorOf(current).walls).toHaveLength(0);
    expect(floorOf(current).rooms).toHaveLength(0);
    expect(JSON.stringify(current)).toBe(JSON.stringify(document));

    while (stack.canRedo) {
      current = stack.redo(current);
    }
    expect(JSON.stringify(current)).toBe(built);
  });

  it("undoes a grouped room in one step", () => {
    const stack = new CommandStack();
    let document = createEmptyVenue();
    const floorId = floorOf(document).id;
    const planned = planRectangularRoom({
      name: "Room",
      width: 4,
      depth: 3,
      roomId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      wallIds: [
        "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        "ffffffff-ffff-4fff-8fff-ffffffffffff",
      ],
    });
    document = stack.execute(
      document,
      groupCommands("ADD_ROOM", [
        ...planned.walls.map((wall) => addWall(floorId, wall)),
        addRoom(floorId, planned.room),
      ]),
    );
    expect(floorOf(document).walls).toHaveLength(4);
    expect(floorOf(document).rooms).toHaveLength(1);
    expect(validateVenue(document).valid).toBe(true);
    const undone = stack.undo(document);
    expect(floorOf(undone).walls).toHaveLength(0);
    expect(floorOf(undone).rooms).toHaveLength(0);
    expect(stack.canRedo).toBe(true);
  });

  it("leaves history unchanged when execute, undo, or redo throws", () => {
    const stack = new CommandStack();
    let document = createEmptyVenue();
    const floorId = floorOf(document).id;
    document = stack.execute(document, addObject(floorId, chair(objectId)));
    const moved = stack.execute(document, moveObject(document, objectId, { x: 2, y: 0, z: 0 }));
    expect(() =>
      stack.execute(createEmptyVenue(), moveObject(document, objectId, { x: 6, y: 0, z: 0 }), {
        merge: true,
      }),
    ).toThrow(CommandError);
    expect(stack.undo(moved).venue.floors[0]?.objects[0]?.transform.position).toEqual({
      x: 1,
      y: 0,
      z: 2,
    });
    const redone = stack.redo(document);
    expect(floorOf(redone).objects[0]?.transform.position).toEqual({ x: 2, y: 0, z: 0 });

    const failing: EditorCommand = {
      type: "ADD_WALL",
      execute: () => {
        throw new Error("execute failed");
      },
      undo: () => {
        throw new Error("undo failed");
      },
    };
    expect(() => stack.execute(redone, failing)).toThrow("execute failed");
    expect(stack.canUndo).toBe(true);
    const stored: EditorCommand = {
      type: "UPDATE_WALL",
      execute: (current) => current,
      undo: () => {
        throw new Error("undo failed");
      },
    };
    stack.execute(redone, stored);
    expect(() => stack.undo(redone)).toThrow("undo failed");
    expect(stack.canUndo).toBe(true);
    expect(stack.canRedo).toBe(false);
  });
});
