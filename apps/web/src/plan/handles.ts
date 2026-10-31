import { distance, type Vec2 } from "@openvenue/geometry";
import type { PlanPoint } from "@openvenue/renderer-2d";
import type { PlanFixture, PlanScene } from "./model";

export interface LocalPoint {
  x: number;
  z: number;
}

export type HandleKind = "resize" | "rotate";

/** World point expressed in the fixture's local plan axes. */
export function toLocal(center: PlanPoint, yaw: number, point: PlanPoint): LocalPoint {
  const dx = point.x - center.x;
  const dz = point.z - center.z;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  return { x: dx * cos - dz * sin, z: dx * sin + dz * cos };
}

export function hitHandle(
  object: PlanFixture,
  point: PlanPoint,
  tolerance = 0.35,
): HandleKind | null {
  const local = toLocal(object.center, object.yaw, point);
  const rotateAt = object.depth / 2 + 0.55;
  if (distance(local, { x: 0, z: rotateAt }) <= tolerance) {
    return "rotate";
  }
  const corners: Vec2[] = [
    { x: object.width / 2, z: object.depth / 2 },
    { x: object.width / 2, z: -object.depth / 2 },
    { x: -object.width / 2, z: object.depth / 2 },
    { x: -object.width / 2, z: -object.depth / 2 },
  ];
  if (corners.some((corner) => distance(local, corner) <= tolerance)) {
    return "resize";
  }
  return null;
}

function inside(point: PlanPoint, a: PlanPoint, b: PlanPoint): boolean {
  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minZ = Math.min(a.z, b.z);
  const maxZ = Math.max(a.z, b.z);
  return point.x >= minX && point.x <= maxX && point.z >= minZ && point.z <= maxZ;
}

function average(points: readonly PlanPoint[]): PlanPoint {
  const sum = points.reduce((total, point) => ({ x: total.x + point.x, z: total.z + point.z }), {
    x: 0,
    z: 0,
  });
  const count = points.length || 1;
  return { x: sum.x / count, z: sum.z / count };
}

/** Ids whose centers fall inside the dragged rectangle. */
export function idsInsideBox(scene: PlanScene, a: PlanPoint, b: PlanPoint): string[] {
  const ids: string[] = [];
  for (const object of scene.objects) {
    if (inside(object.center, a, b)) {
      ids.push(object.id);
    }
  }
  for (const spawn of scene.spawns) {
    if (inside(spawn.point, a, b)) {
      ids.push(spawn.id);
    }
  }
  for (const room of scene.rooms) {
    if (inside(average(room.points), a, b)) {
      ids.push(room.id);
    }
  }
  for (const zone of scene.zones) {
    if (inside(average(zone.points), a, b)) {
      ids.push(zone.id);
    }
  }
  for (const wall of scene.walls) {
    if (inside(average([wall.start, wall.end]), a, b)) {
      ids.push(wall.id);
    }
  }
  return ids;
}
