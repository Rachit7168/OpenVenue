import { distance, type Vec2 } from "./vec.js";
import { polygonArea, polygonCentroid } from "./polygon.js";

export interface WallLine {
  start: Vec2;
  end: Vec2;
}

export function wallLength(wall: WallLine): number {
  return distance(wall.start, wall.end);
}

/** Angle of the wall on the plan, in radians, from +X toward +Z. */
export function wallAngle(wall: WallLine): number {
  return Math.atan2(wall.end.z - wall.start.z, wall.end.x - wall.start.x);
}

export function wallMidpoint(wall: WallLine): Vec2 {
  return {
    x: (wall.start.x + wall.end.x) / 2,
    z: (wall.start.z + wall.end.z) / 2,
  };
}

export interface OpeningPlacement {
  offset: number;
  width: number;
}

export interface OpeningSpan {
  start: Vec2;
  end: Vec2;
  valid: boolean;
}

/** Centerline span of a door or window. `offset` is metres from the wall start to the near edge. */
export function openingSpan(wall: WallLine, opening: OpeningPlacement): OpeningSpan {
  const length = wallLength(wall);
  const dx = wall.end.x - wall.start.x;
  const dz = wall.end.z - wall.start.z;
  const scale = length === 0 ? 0 : 1 / length;
  const direction = { x: dx * scale, z: dz * scale };
  const far = opening.offset + opening.width;
  const valid = length > 0 && opening.width > 0 && opening.offset >= -1e-9 && far <= length + 1e-9;
  return {
    start: {
      x: wall.start.x + direction.x * opening.offset,
      z: wall.start.z + direction.z * opening.offset,
    },
    end: {
      x: wall.start.x + direction.x * far,
      z: wall.start.z + direction.z * far,
    },
    valid,
  };
}

export interface RectangularRoom {
  boundary: [Vec2, Vec2, Vec2, Vec2];
  walls: [WallLine, WallLine, WallLine, WallLine];
  area: number;
  centroid: Vec2;
}

/**
 * A rectangular room on the plan. Width runs along +X, depth along +Z.
 * The boundary is counter-clockwise when viewed from +Y. Walls follow that ring.
 */
export function buildRectangularRoom(options: {
  origin?: Vec2;
  width: number;
  depth: number;
}): RectangularRoom {
  const origin = options.origin ?? { x: 0, z: 0 };
  if (!(options.width > 0) || !(options.depth > 0)) {
    throw new Error("room width and depth must be positive");
  }
  const farX = origin.x + options.width;
  const farZ = origin.z + options.depth;
  const boundary: [Vec2, Vec2, Vec2, Vec2] = [
    { x: origin.x, z: origin.z },
    { x: origin.x, z: farZ },
    { x: farX, z: farZ },
    { x: farX, z: origin.z },
  ];
  const walls: [WallLine, WallLine, WallLine, WallLine] = [
    { start: boundary[0], end: boundary[1] },
    { start: boundary[1], end: boundary[2] },
    { start: boundary[2], end: boundary[3] },
    { start: boundary[3], end: boundary[0] },
  ];
  return {
    boundary,
    walls,
    area: polygonArea(boundary),
    centroid: polygonCentroid(boundary),
  };
}
