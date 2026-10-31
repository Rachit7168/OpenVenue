import { describe, expect, it } from "vitest";
import { commitPolygon, rectangleFromCorners } from "./draw";

describe("drawing", () => {
  it("builds a rectangle from two corners and rejects a tiny drag", () => {
    expect(rectangleFromCorners({ x: 4, z: 1 }, { x: 0, z: 5 })).toEqual({
      origin: { x: 0, z: 1 },
      width: 4,
      depth: 4,
    });
    expect(rectangleFromCorners({ x: 0, z: 0 }, { x: 0.05, z: 2 })).toBeNull();
  });

  it("closes a polygon onto its start and rejects a crossing", () => {
    const square = [
      { x: 0, z: 0 },
      { x: 0, z: 4 },
      { x: 4, z: 4 },
      { x: 4, z: 0 },
    ];
    const closed = commitPolygon(square, { x: 0.1, z: 0.1 });
    expect(closed && "points" in closed && closed.points).toHaveLength(4);

    const bowtie = [
      { x: 0, z: 0 },
      { x: 2, z: 2 },
      { x: 0, z: 2 },
      { x: 2, z: 0 },
    ];
    expect(commitPolygon(bowtie, { x: 0, z: 0 })).toEqual({
      error: "That outline crosses itself.",
    });
  });
});
