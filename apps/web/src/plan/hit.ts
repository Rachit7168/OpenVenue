import { distance, pointInPolygon, type Vec2 } from "@openvenue/geometry";
import type { PlanPoint } from "@openvenue/renderer-2d";
import type { PlanScene } from "./model";

export interface PlanHit {
  kind: "object" | "spawn" | "wall" | "room" | "zone";
  id: string;
}

function asVec(point: PlanPoint): Vec2 {
  return { x: point.x, z: point.z };
}

function segmentDistance(point: PlanPoint, start: PlanPoint, end: PlanPoint): number {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared <= 1e-12) {
    return distance(asVec(point), asVec(start));
  }
  const t = Math.min(
    1,
    Math.max(0, ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared),
  );
  return distance(asVec(point), { x: start.x + t * dx, z: start.z + t * dz });
}

/** Objects and markers win over walls, then rooms and zones. */
export function hitPlan(scene: PlanScene, point: PlanPoint): PlanHit | null {
  for (const object of [...scene.objects].reverse()) {
    if (pointInPolygon(asVec(point), object.points as Vec2[])) {
      return { kind: "object", id: object.id };
    }
  }
  for (const spawn of scene.spawns) {
    if (distance(asVec(point), asVec(spawn.point)) <= 0.45) {
      return { kind: "spawn", id: spawn.id };
    }
  }
  let wallHit: { id: string; distance: number } | null = null;
  for (const wall of scene.walls) {
    const gap = segmentDistance(point, wall.start, wall.end);
    const limit = Math.max(0.3, wall.thickness);
    if (gap <= limit && (wallHit === null || gap < wallHit.distance)) {
      wallHit = { id: wall.id, distance: gap };
    }
  }
  if (wallHit) {
    return { kind: "wall", id: wallHit.id };
  }
  for (const room of [...scene.rooms].reverse()) {
    if (pointInPolygon(asVec(point), room.points as Vec2[])) {
      return { kind: "room", id: room.id };
    }
  }
  for (const zone of [...scene.zones].reverse()) {
    if (pointInPolygon(asVec(point), zone.points as Vec2[])) {
      return { kind: "zone", id: zone.id };
    }
  }
  return null;
}
