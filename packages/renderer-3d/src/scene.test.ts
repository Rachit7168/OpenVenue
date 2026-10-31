import { createEmptyVenue } from "@openvenue/scene-schema";
import * as THREE from "three";
import { describe, expect, it } from "vitest";
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
});
