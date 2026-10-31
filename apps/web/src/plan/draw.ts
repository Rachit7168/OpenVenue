import {
  distance,
  isCounterClockwise,
  polygonSelfIntersects,
  type Vec2,
} from "@openvenue/geometry";
import type { PlanPoint } from "@openvenue/renderer-2d";

const MINIMUM_EDGE = 0.2;

export interface RectangleDraft {
  origin: PlanPoint;
  width: number;
  depth: number;
}

/** Axis-aligned hall from two corners. Too-small drags are rejected. */
export function rectangleFromCorners(
  start: PlanPoint,
  end: PlanPoint,
  minimum = MINIMUM_EDGE,
): RectangleDraft | null {
  const width = Math.abs(end.x - start.x);
  const depth = Math.abs(end.z - start.z);
  if (width < minimum || depth < minimum) {
    return null;
  }
  return {
    origin: { x: Math.min(start.x, end.x), z: Math.min(start.z, end.z) },
    width,
    depth,
  };
}

export function ensureCounterClockwise(points: readonly PlanPoint[]): PlanPoint[] {
  const copy = points.map((point) => ({ x: point.x, z: point.z }));
  return isCounterClockwise(copy as Vec2[]) ? copy : copy.reverse();
}

/** Close a polygon when the new point lands on the start. Rejects crossings. */
export function commitPolygon(
  points: readonly PlanPoint[],
  next: PlanPoint,
  closeDistance = 0.4,
): { points: PlanPoint[] } | { error: string } | null {
  if (points.length >= 3 && distance(points[0] as Vec2, next as Vec2) <= closeDistance) {
    const ring = ensureCounterClockwise(points);
    if (polygonSelfIntersects(ring as Vec2[])) {
      return { error: "That outline crosses itself." };
    }
    return { points: ring };
  }
  if (points.length > 0) {
    const last = points[points.length - 1];
    if (last && distance(last as Vec2, next as Vec2) < MINIMUM_EDGE) {
      return { error: "That point is too close to the previous one." };
    }
  }
  return null;
}
