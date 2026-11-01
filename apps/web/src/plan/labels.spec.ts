import { describe, expect, it } from "vitest";
import { objectAnnotations, openingAnnotations, wallAnnotations } from "./labels";

describe("plan annotations", () => {
  it("labels a wall with its length outside the line", () => {
    const [label] = wallAnnotations([
      { id: "south", start: { x: 8, z: 0 }, end: { x: 0, z: 0 }, thickness: 0.2 },
    ]);
    expect(label?.text).toBe("8.00 m");
    expect(label?.point.z).toBeLessThan(0);
  });

  it("labels a door with its width", () => {
    const [label] = openingAnnotations([
      { id: "door", kind: "door", start: { x: 3, z: 0 }, end: { x: 4.4, z: 0 } },
    ]);
    expect(label?.text).toBe("Door 1.40 m");
    expect(label?.point).toEqual({ x: 3.7, z: 0 });
  });

  it("names the stage and skips chairs", () => {
    const labels = objectAnnotations([
      {
        id: "chair",
        name: "Chair 1",
        type: "chair",
        center: { x: 1, z: 1 },
        width: 0.46,
        depth: 0.46,
        yaw: 0,
        points: [],
      },
      {
        id: "stage",
        name: "Stage",
        type: "stage",
        center: { x: 4, z: 6 },
        width: 4,
        depth: 2,
        yaw: 0,
        points: [],
      },
    ]);
    expect(labels.map((label) => label.text)).toEqual(["Stage"]);
    expect(labels[0]?.point.z).toBeGreaterThan(6);
  });
});
