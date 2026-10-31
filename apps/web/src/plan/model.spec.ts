import { createEmptyVenue } from "@openvenue/scene-schema";
import { describe, expect, it } from "vitest";
import { planScene } from "./model";

describe("planScene", () => {
  it("applies horizontal scale to an object footprint", () => {
    const document = createEmptyVenue();
    const floor = document.venue.floors[0];
    if (!floor) {
      throw new Error("missing floor");
    }
    floor.objects.push({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      type: "table",
      name: "Table",
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 2, y: 1, z: 3 },
      },
      dimensions: { width: 1, height: 0.75, depth: 1 },
    });

    const footprint = planScene(document).objects[0]?.points ?? [];
    const xs = footprint.map((point) => point.x);
    const zs = footprint.map((point) => point.z);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(2);
    expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(3);
  });
});
