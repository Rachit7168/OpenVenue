import { createEmptyVenue } from "@openvenue/scene-schema";
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { materialPreset } from "./materials.js";
import { buildVenueGroup } from "./scene.js";

describe("buildVenueGroup", () => {
  it("builds a floor, a ceiling, and a wall with a door lintel", () => {
    const document = createEmptyVenue();
    const floor = document.venue.floors[0];
    if (!floor) {
      throw new Error("missing floor");
    }
    floor.rooms.push({
      id: "room",
      name: "Hall",
      boundary: [
        { x: 0, z: 0 },
        { x: 0, z: 8 },
        { x: 10, z: 8 },
        { x: 10, z: 0 },
      ],
    });
    floor.walls.push({
      id: "wall",
      start: { x: 0, z: 0 },
      end: { x: 10, z: 0 },
      thickness: 0.2,
      height: 3,
      openings: [{ id: "door", kind: "door", offset: 4, width: 1, height: 2.1 }],
    });
    floor.objects.push({
      id: "table",
      type: "table",
      name: "Table",
      transform: {
        position: { x: 4, y: 0, z: 3 },
        rotation: { x: 0, y: 0, z: 0 },
      },
      dimensions: { width: 1.2, height: 0.75, depth: 0.8 },
    });

    const group = buildVenueGroup(document);
    const box = new THREE.Box3().setFromObject(group);
    expect(group.children.length).toBeGreaterThanOrEqual(5);
    expect(box.max.y).toBeGreaterThan(2.5);
    expect(box.max.x).toBeGreaterThan(9);
  });

  it("cuts a window above its sill and keeps openings inside the wall", () => {
    const document = createEmptyVenue();
    const floor = document.venue.floors[0];
    if (!floor) {
      throw new Error("missing floor");
    }
    floor.walls.push({
      id: "wall",
      start: { x: 0, z: 0 },
      end: { x: 10, z: 0 },
      thickness: 0.2,
      height: 3,
      openings: [
        { id: "window", kind: "window", offset: 4, width: 1, height: 1.2, sill: 1 },
        { id: "past", kind: "opening", offset: 9, width: 4, height: 2 },
      ],
    });
    const spawn = document.venue.spawnPoints[0];
    if (spawn) {
      spawn.position = { x: 1, y: 2, z: 1 };
    }

    const group = buildVenueGroup(document);
    const windowGap = new THREE.Vector3(4.5, 1.6, 0);
    const covered = group.children.some((child) => {
      if (!(child instanceof THREE.Mesh)) {
        return false;
      }
      return new THREE.Box3().setFromObject(child).containsPoint(windowGap);
    });
    expect(covered).toBe(false);
    expect(new THREE.Box3().setFromObject(group).max.x).toBeLessThanOrEqual(10.2);
    const marker = group.children.find(
      (child) => child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry,
    );
    expect(marker?.position.y).toBeCloseTo(2.22);
  });

  it("uses the room floor material and one batch for repeated chairs", () => {
    const document = createEmptyVenue();
    const floor = document.venue.floors[0];
    if (!floor) {
      throw new Error("missing floor");
    }
    floor.rooms.push({
      id: "room",
      name: "Hall",
      floorMaterial: "wood",
      boundary: [
        { x: 0, z: 0 },
        { x: 0, z: 8 },
        { x: 12, z: 8 },
        { x: 12, z: 0 },
      ],
    });
    for (let index = 0; index < 200; index += 1) {
      floor.objects.push({
        id: `chair-${index}`,
        type: "chair",
        name: "Chair",
        transform: {
          position: { x: (index % 20) * 0.6, y: 0, z: Math.floor(index / 20) * 0.6 },
          rotation: { x: 0, y: 0, z: 0 },
        },
        dimensions: { width: 0.45, height: 0.9, depth: 0.45 },
      });
    }
    floor.objects.push({
      id: "wide-chair",
      type: "chair",
      name: "Wide",
      transform: {
        position: { x: 1, y: 0, z: 1 },
        rotation: { x: 0, y: 0, z: 0 },
      },
      dimensions: { width: 0.7, height: 0.9, depth: 0.45 },
    });

    const group = buildVenueGroup(document);
    const slabs = group.children.filter(
      (child) =>
        child instanceof THREE.Mesh &&
        !(child instanceof THREE.InstancedMesh) &&
        child.material === materialPreset("wood"),
    );
    expect(slabs.length).toBeGreaterThan(0);
    const batches = group.children.filter((child) => child instanceof THREE.InstancedMesh);
    expect(batches).toHaveLength(2);
    const crowd = batches.find(
      (child) => child instanceof THREE.InstancedMesh && child.count === 200,
    );
    if (!(crowd instanceof THREE.InstancedMesh)) {
      throw new Error("missing chair batch");
    }
    expect(crowd.material).toBe(materialPreset("wood"));
    crowd.computeBoundingSphere();
    expect(crowd.boundingSphere?.radius ?? 0).toBeGreaterThan(2);
    expect(group.children.some((child) => child.userData.entityId === "chair-0")).toBe(false);
  });
});
