import { createEmptyVenue } from "@openvenue/scene-schema";
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { buildVenueGroup } from "./scene.js";
import { patchVenueGroup } from "./sync.js";

describe("patchVenueGroup", () => {
  it("moves a stage mesh and keeps its geometry", () => {
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
    const group = buildVenueGroup(document);
    const mesh = group.children.find((child) => child.userData.entityId === "stage-1");
    if (!(mesh instanceof THREE.Mesh)) {
      throw new Error("missing stage");
    }
    const geometry = mesh.geometry;
    const moved = structuredClone(document);
    const stage = moved.venue.floors[0]?.objects[0];
    if (!stage) {
      throw new Error("missing stage document");
    }
    stage.transform.position = { x: 4, y: 0, z: 2 };
    expect(patchVenueGroup(group, moved, "MOVE_OBJECT")).toBe(true);
    expect(mesh.position.x).toBeCloseTo(4);
    expect(mesh.geometry).toBe(geometry);
    expect(patchVenueGroup(group, moved, "ADD_WALL")).toBe(false);
  });
});
