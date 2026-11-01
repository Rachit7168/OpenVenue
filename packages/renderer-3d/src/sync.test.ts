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
    let mesh: THREE.Object3D | undefined;
    group.traverse((child) => {
      if (child.userData.entityId === "stage-1") {
        mesh = child;
      }
    });
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

  it("moves one chair inside its batch", () => {
    const document = createEmptyVenue();
    const floor = document.venue.floors[0];
    if (!floor) {
      throw new Error("missing floor");
    }
    floor.objects.push({
      id: "chair-1",
      type: "chair",
      name: "Chair",
      transform: {
        position: { x: 1, y: 0, z: 2 },
        rotation: { x: 0, y: 0, z: 0 },
      },
      dimensions: { width: 0.45, height: 0.9, depth: 0.45 },
    });
    const group = buildVenueGroup(document);
    let batch: THREE.Object3D | undefined;
    group.traverse((child) => {
      if (child instanceof THREE.InstancedMesh) {
        batch = child;
      }
    });
    if (!(batch instanceof THREE.InstancedMesh)) {
      throw new Error("missing chair batch");
    }
    const moved = structuredClone(document);
    const chair = moved.venue.floors[0]?.objects[0];
    if (!chair) {
      throw new Error("missing chair document");
    }
    chair.transform.position = { x: 4, y: 0, z: 2 };
    expect(patchVenueGroup(group, moved, "MOVE_OBJECT")).toBe(true);
    const matrix = new THREE.Matrix4();
    batch.getMatrixAt(0, matrix);
    expect(new THREE.Vector3().setFromMatrixPosition(matrix).x).toBeCloseTo(4);
    chair.dimensions = { width: 0.8, height: 0.9, depth: 0.45 };
    expect(patchVenueGroup(group, moved, "RESIZE_OBJECT")).toBe(false);
  });
});
