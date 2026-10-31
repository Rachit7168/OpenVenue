import { moveObject } from "@openvenue/editor-core";
import { buildVenueGroup, patchVenueGroup } from "@openvenue/renderer-3d";
import { createEmptyVenue } from "@openvenue/scene-schema";
import { SceneStore } from "@openvenue/scene-engine";
import { describe, expect, it } from "vitest";
import { planScene } from "./model";

describe("plan and 3D sync", () => {
  it("moves a stage from the plan into 3D and back", () => {
    const document = createEmptyVenue();
    const floor = document.venue.floors[0];
    if (!floor) {
      throw new Error("missing floor");
    }
    floor.objects.push({
      id: "stage-1",
      type: "stage",
      name: "Stage",
      transform: {
        position: { x: 1, y: 0, z: 2 },
        rotation: { x: 0, y: 0, z: 0 },
      },
      dimensions: { width: 2, height: 0.4, depth: 1 },
    });
    const store = new SceneStore(document);
    const group = buildVenueGroup(store.getDocument());
    const mesh = group.children.find((child) => child.userData.entityId === "stage-1");
    if (!mesh) {
      throw new Error("missing stage");
    }
    store.subscribe((change) => {
      if (change.kind === "document") {
        patchVenueGroup(group, change.document, change.commandType);
      }
    });

    store.execute(moveObject(store.getDocument(), "stage-1", { x: 4, y: 0, z: 2 }));
    expect(mesh.position.x).toBeCloseTo(4);
    expect(planScene(store.getDocument()).objects[0]?.center.x).toBeCloseTo(4);

    store.execute(moveObject(store.getDocument(), "stage-1", { x: 1.5, y: 0, z: 3 }));
    expect(planScene(store.getDocument()).objects[0]?.center).toMatchObject({ x: 1.5, z: 3 });
    expect(mesh.position.x).toBeCloseTo(1.5);
    expect(mesh.position.z).toBeCloseTo(3);

    store.undo();
    expect(planScene(store.getDocument()).objects[0]?.center.x).toBeCloseTo(4);
    expect(mesh.position.x).toBeCloseTo(4);
  });
});
