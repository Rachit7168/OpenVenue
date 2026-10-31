import { addWall, planRectangularRoom } from "@openvenue/editor-core";
import { createEmptyVenue } from "@openvenue/scene-schema";
import { describe, expect, it } from "vitest";
import { SceneStore, type SceneChange } from "./store.js";

describe("scene store", () => {
  it("sends the same document event to every subscriber", () => {
    const store = new SceneStore(createEmptyVenue());
    const floor = store.getDocument().venue.floors[0];
    if (!floor) {
      throw new Error("missing floor");
    }
    const planned = planRectangularRoom({
      name: "Hall",
      width: 4,
      depth: 3,
      roomId: "99999999-9999-4999-8999-999999999999",
      wallIds: [
        "55555555-5555-4555-8555-555555555555",
        "66666666-6666-4666-8666-666666666666",
        "77777777-7777-4777-8777-777777777777",
        "88888888-8888-4888-8888-888888888888",
      ],
    });
    const first: SceneChange[] = [];
    const second: SceneChange[] = [];
    store.subscribe((change) => first.push(change));
    store.subscribe((change) => second.push(change));

    const wall = planned.walls[0];
    if (!wall) {
      throw new Error("missing wall");
    }
    store.execute(addWall(floor.id, wall));

    expect(first).toHaveLength(1);
    expect(first[0]).toBe(second[0]);
    expect(first[0]).toMatchObject({
      kind: "document",
      reason: "execute",
      commandType: "ADD_WALL",
    });
    expect(store.getDocument().venue.floors[0]?.walls).toHaveLength(1);

    const beforeUndo = JSON.stringify(store.getDocument());
    store.undo();
    expect(store.getDocument().venue.floors[0]?.walls).toHaveLength(0);
    store.redo();
    expect(JSON.stringify(store.getDocument())).toBe(beforeUndo);
    expect(second[2]).toMatchObject({ kind: "document", reason: "redo" });
  });

  it("keeps selection off the document and clears history on replace", () => {
    const store = new SceneStore(createEmptyVenue());
    const events: SceneChange[] = [];
    store.subscribe((change) => events.push(change));
    store.setSelection(["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]);
    expect(events.map((event) => event.kind)).toEqual(["selection"]);
    expect(store.getSelection().ids).toEqual(["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]);

    const floor = store.getDocument().venue.floors[0];
    if (!floor) {
      throw new Error("missing floor");
    }
    store.execute(
      addWall(floor.id, {
        id: "55555555-5555-4555-8555-555555555555",
        start: { x: 0, z: 0 },
        end: { x: 2, z: 0 },
        thickness: 0.2,
        height: 3,
      }),
    );
    expect(store.canUndo).toBe(true);
    store.replaceDocument(createEmptyVenue());
    expect(store.canUndo).toBe(false);
    expect(store.getDocument().venue.floors[0]?.walls).toHaveLength(0);
  });
});
