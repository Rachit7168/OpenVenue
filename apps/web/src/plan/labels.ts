import { wallLength } from "@openvenue/geometry";
import type { PlanPoint } from "@openvenue/renderer-2d";
import type { PlanFixture, PlanOpening, PlanWall } from "./model";

export interface PlanAnnotation {
  id: string;
  text: string;
  point: PlanPoint;
}

function midpoint(start: PlanPoint, end: PlanPoint): PlanPoint {
  return { x: (start.x + end.x) / 2, z: (start.z + end.z) / 2 };
}

/** Length label set just outside the wall. */
export function wallAnnotations(walls: readonly PlanWall[]): PlanAnnotation[] {
  return walls.map((wall) => {
    const length = wallLength(wall);
    const mid = midpoint(wall.start, wall.end);
    const dx = wall.end.x - wall.start.x;
    const dz = wall.end.z - wall.start.z;
    const span = Math.hypot(dx, dz) || 1;
    const offset = Math.max(wall.thickness, 0.2) + 0.35;
    return {
      id: wall.id,
      text: `${length.toFixed(2)} m`,
      point: {
        x: mid.x + (-dz / span) * offset,
        z: mid.z + (dx / span) * offset,
      },
    };
  });
}

/** Door, window, or plain opening width at the middle of the gap. */
export function openingAnnotations(openings: readonly PlanOpening[]): PlanAnnotation[] {
  return openings.map((opening) => {
    const width = Math.hypot(opening.end.x - opening.start.x, opening.end.z - opening.start.z);
    const kind =
      opening.kind === "window" ? "Window" : opening.kind === "door" ? "Door" : "Opening";
    return {
      id: opening.id,
      text: `${kind} ${width.toFixed(2)} m`,
      point: midpoint(opening.start, opening.end),
    };
  });
}

/** Names for furniture other than chairs, which would cover a seated hall. */
export function objectAnnotations(objects: readonly PlanFixture[]): PlanAnnotation[] {
  return objects
    .filter((object) => object.type !== "chair")
    .map((object) => ({
      id: object.id,
      text: object.name,
      point: { x: object.center.x, z: object.center.z + object.depth / 2 + 0.2 },
    }));
}
