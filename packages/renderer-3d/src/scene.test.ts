import { createEmptyVenue } from "@openvenue/scene-schema";
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { materialPreset } from "./materials.js";
import { buildVenueGroup, MAP_FLOOR_GAP, MAP_WALL_HEIGHT } from "./scene.js";

function nodesOf(group: THREE.Object3D): THREE.Object3D[] {
  const nodes: THREE.Object3D[] = [];
  group.traverse((child) => {
    if (child !== group) {
      nodes.push(child);
    }
  });
  return nodes;
}

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
    expect(
      nodesOf(group).filter((child) => child instanceof THREE.Mesh).length,
    ).toBeGreaterThanOrEqual(5);
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
    const covered = nodesOf(group).some((child) => {
      if (!(child instanceof THREE.Mesh)) {
        return false;
      }
      return new THREE.Box3().setFromObject(child).containsPoint(windowGap);
    });
    expect(covered).toBe(false);
    expect(new THREE.Box3().setFromObject(group).max.x).toBeLessThanOrEqual(10.2);
    const marker = nodesOf(group).find(
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
    const nodes = nodesOf(group);
    const slabs = nodes.filter(
      (child) =>
        child instanceof THREE.Mesh &&
        !(child instanceof THREE.InstancedMesh) &&
        child.material === materialPreset("wood"),
    );
    expect(slabs.length).toBeGreaterThan(0);
    const batches = nodes.filter((child) => child instanceof THREE.InstancedMesh);
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
    expect(nodes.some((child) => child.userData.entityId === "chair-0")).toBe(false);
  });

  it("stacks every floor and draws the map as short separated plates", () => {
    const document = createEmptyVenue();
    const ground = document.venue.floors[0];
    if (!ground) {
      throw new Error("missing floor");
    }
    ground.rooms.push({
      id: "hall",
      name: "Hall",
      boundary: [
        { x: 0, z: 0 },
        { x: 0, z: 8 },
        { x: 10, z: 8 },
        { x: 10, z: 0 },
      ],
    });
    ground.walls.push({
      id: "south",
      start: { x: 0, z: 0 },
      end: { x: 10, z: 0 },
      thickness: 0.2,
      height: 3,
    });
    const gallery = {
      ...ground,
      id: "gallery",
      name: "Gallery",
      level: 1,
      elevation: 4,
      rooms: ground.rooms.map((room) => ({ ...room, id: "gallery-room" })),
      walls: ground.walls.map((wall) => ({ ...wall, id: "gallery-wall" })),
      objects: [],
      zones: [],
    };
    document.venue.floors.push(gallery);

    const hall = buildVenueGroup(document);
    const hallFloors = hall.children.filter((child) => child.userData.floorId);
    expect(hallFloors.map((child) => child.position.y)).toEqual([0, 4]);
    expect(new THREE.Box3().setFromObject(hall).max.y).toBeGreaterThan(6);

    const map = buildVenueGroup(document, { style: "map" });
    const plates = map.children.filter((child) => typeof child.userData.floorId === "string");
    expect(plates[1]?.position.y).toBeCloseTo(4 + MAP_FLOOR_GAP);
    const wall = nodesOf(plates[0] ?? map).find(
      (child) => child instanceof THREE.Mesh && child.geometry instanceof THREE.BoxGeometry,
    );
    if (!(wall instanceof THREE.Mesh) || !(wall.geometry instanceof THREE.BoxGeometry)) {
      throw new Error("missing map wall");
    }
    expect(wall.geometry.parameters.height).toBeCloseTo(MAP_WALL_HEIGHT);
    expect(
      nodesOf(map).some(
        (child) => child instanceof THREE.Mesh && child.material === materialPreset("concrete"),
      ),
    ).toBe(false);

    const one = buildVenueGroup(document, { style: "map", floorId: "gallery" });
    expect(one.children).toHaveLength(1);
    expect(one.children[0]?.userData.floorId).toBe("gallery");
    expect(one.children[0]?.position.y).toBeCloseTo(4);
  });
});
