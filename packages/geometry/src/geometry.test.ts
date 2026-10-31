import { describe, expect, it } from "vitest";
import {
  buildRectangularRoom,
  degreesToRadians,
  formatDegrees,
  isCounterClockwise,
  openingSpan,
  planToWorld,
  pointInPolygon,
  polygonArea,
  polygonCentroid,
  polygonSelfIntersects,
  quantize,
  radiansToDegrees,
  segmentIntersection,
  snapPoint,
  snapToGrid,
  validateGeometry,
  wallAngle,
  wallLength,
  worldToPlan,
} from "./index.js";

describe("units", () => {
  it("converts degrees and radians", () => {
    expect(radiansToDegrees(Math.PI)).toBeCloseTo(180);
    expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2);
    expect(formatDegrees(degreesToRadians(45), 0)).toBe("45°");
  });

  it("maps plan points onto the world XZ plane", () => {
    expect(planToWorld({ x: 2, z: 4 }, 3)).toEqual({ x: 2, y: 3, z: 4 });
    expect(worldToPlan({ x: 2, y: 9, z: 4 })).toEqual({ x: 2, z: 4 });
  });

  it("quantizes grid snaps to the nearest 0.5 m and 0.01 m", () => {
    expect(snapToGrid({ x: 0.24, z: 0.8 })).toEqual({ x: 0, z: 1 });
    expect(snapToGrid({ x: 0.26, z: -0.2 })).toEqual({ x: 0.5, z: 0 });
    expect(quantize(0.25, 0.25)).toBe(0.25);
    expect(quantize(0.5, 0.01)).toBe(0.5);
  });

  it("rejects a grid that cannot represent its own points", () => {
    expect(() => snapToGrid({ x: 0.4, z: 0 }, { size: 0.5, precision: 0.3 })).toThrow(
      /multiple of precision/,
    );
    expect(() =>
      snapToGrid({ x: 1, z: 1 }, { size: Number.POSITIVE_INFINITY, precision: 0.01 }),
    ).toThrow(/finite/);
  });
});

describe("snapping", () => {
  const walls = [{ id: "south", start: { x: 0, z: 0 }, end: { x: 10, z: 0 } }];

  it("prefers an endpoint over the grid", () => {
    const result = snapPoint({ x: 0.1, z: 0.1 }, walls);
    expect(result.kind).toBe("endpoint");
    expect(result.wallId).toBe("south");
    expect(result.point).toEqual({ x: 0, z: 0 });
  });

  it("snaps to a wall when no endpoint is in range", () => {
    const result = snapPoint({ x: 5, z: 0.1 }, walls);
    expect(result).toEqual({ point: { x: 5, z: 0 }, kind: "wall", wallId: "south" });
  });

  it("falls back to the grid", () => {
    const result = snapPoint({ x: 1.2, z: 3.2 }, walls);
    expect(result).toEqual({ point: { x: 1, z: 3 }, kind: "grid" });
  });

  it("breaks endpoint ties by wall id and start", () => {
    const overlapping = [
      { id: "b", start: { x: 0, z: 0 }, end: { x: 1, z: 0 } },
      { id: "a", start: { x: 0, z: 0 }, end: { x: 0, z: 1 } },
    ];
    const result = snapPoint({ x: 0, z: 0 }, overlapping);
    expect(result).toEqual({ point: { x: 0, z: 0 }, kind: "endpoint", wallId: "a" });
  });
});

describe("rooms and walls", () => {
  it("builds a rectangular room and computes its area", () => {
    const room = buildRectangularRoom({ width: 10, depth: 8 });
    expect(room.area).toBeCloseTo(80);
    expect(room.centroid).toEqual({ x: 5, z: 4 });
    expect(isCounterClockwise(room.boundary)).toBe(true);
    expect(wallLength(room.walls[0])).toBeCloseTo(8);
    expect(wallAngle(room.walls[0])).toBeCloseTo(Math.PI / 2);
    expect(wallLength(room.walls[1])).toBeCloseTo(10);
    expect(pointInPolygon({ x: 1, z: 1 }, room.boundary)).toBe(true);
    expect(pointInPolygon({ x: 10, z: 0 }, room.boundary)).toBe(true);
    expect(pointInPolygon({ x: -1, z: 1 }, room.boundary)).toBe(false);
    expect(polygonSelfIntersects(room.boundary)).toBe(false);
  });

  it("places a door along a wall and rejects one that runs past the end", () => {
    const wall = { start: { x: 0, z: 0 }, end: { x: 10, z: 0 } };
    const door = openingSpan(wall, { offset: 2, width: 1.2 });
    expect(door.valid).toBe(true);
    expect(door.start).toEqual({ x: 2, z: 0 });
    expect(door.end).toEqual({ x: 3.2, z: 0 });
    expect(openingSpan(wall, { offset: 9, width: 2 }).valid).toBe(false);
  });

  it("detects a crossing and a segment intersection", () => {
    const bowtie = [
      { x: 0, z: 0 },
      { x: 1, z: 1 },
      { x: 0, z: 1 },
      { x: 1, z: 0 },
    ];
    expect(polygonSelfIntersects(bowtie)).toBe(true);
    const touching = [
      { x: 0, z: 0 },
      { x: 2, z: 0 },
      { x: 2, z: 1 },
      { x: 1, z: 0 },
      { x: 0, z: 1 },
    ];
    expect(polygonSelfIntersects(touching)).toBe(true);
    const overlap = [
      { x: 0, z: 0 },
      { x: 3, z: 0 },
      { x: 3, z: 1 },
      { x: 2, z: 0 },
      { x: 1, z: 0 },
      { x: 1, z: 1 },
    ];
    expect(polygonSelfIntersects(overlap)).toBe(true);
    const hit = segmentIntersection({ x: 0, z: 0 }, { x: 1, z: 1 }, { x: 0, z: 1 }, { x: 1, z: 0 });
    expect(hit?.point.x).toBeCloseTo(0.5);
    expect(hit?.point.z).toBeCloseTo(0.5);
  });

  it("returns typed errors for invalid walls and rooms", () => {
    const issues = validateGeometry({
      walls: [
        {
          id: "flat",
          start: { x: 0, z: 0 },
          end: { x: 0, z: 0 },
          thickness: 0,
          height: 3,
          openings: [{ id: "door", offset: 0, width: 1 }],
        },
      ],
      rooms: [
        {
          id: "bowtie",
          boundary: [
            { x: 0, z: 0 },
            { x: 1, z: 1 },
            { x: 0, z: 1 },
            { x: 1, z: 0 },
          ],
        },
        {
          id: "line",
          boundary: [
            { x: 0, z: 0 },
            { x: 1, z: 0 },
          ],
        },
      ],
    });
    expect(issues.map((issue) => issue.ruleId)).toEqual([
      "wall.zero-length",
      "wall.zero-thickness",
      "opening.out-of-range",
      "room.self-intersection",
      "room.too-few-points",
    ]);
    expect(issues.every((issue) => issue.severity === "error" && issue.objectIds.length > 0)).toBe(
      true,
    );
    expect(polygonArea([])).toBe(0);
    expect(polygonCentroid([])).toEqual({ x: 0, z: 0 });
  });
});
