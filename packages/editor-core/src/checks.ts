import {
  openingSpan,
  pointInPolygon,
  segmentIntersection,
  wallLength,
  type Vec2,
} from "@openvenue/geometry";
import type { SceneObject, VenueDocument, Wall } from "@openvenue/scene-schema";

export const CHECK_NOTE = "Planning checks only. This is not a safety or legal certification.";

const MIN_CLEAR_METRES = 0.9;
const OVERLAP_METRES = 0.02;

export interface SceneLocation {
  x: number;
  z: number;
}

export interface VenueWarning {
  ruleId:
    | "object.outside-floor"
    | "object.overlap"
    | "object.invalid-dimensions"
    | "spawn.missing-entrance"
    | "spawn.missing-exit"
    | "door.obstructed"
    | "pathway.narrow";
  severity: "warning" | "error";
  objectIds: string[];
  description: string;
  suggestedFix: string;
  location: SceneLocation;
}

interface Footprint {
  object: SceneObject;
  corners: [Vec2, Vec2, Vec2, Vec2];
  center: Vec2;
}

function shown(entity: object): boolean {
  return (entity as { visible?: unknown }).visible !== false;
}

function finiteSize(value: number | undefined): boolean {
  return value !== undefined && Number.isFinite(value) && value > 0 && value <= 100;
}

function cornersOf(object: SceneObject): [Vec2, Vec2, Vec2, Vec2] {
  const width = object.dimensions?.width ?? 0.6;
  const depth = object.dimensions?.depth ?? 0.6;
  const yaw = object.transform.rotation.y;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const center = object.transform.position;
  const local: Vec2[] = [
    { x: -width / 2, z: -depth / 2 },
    { x: width / 2, z: -depth / 2 },
    { x: width / 2, z: depth / 2 },
    { x: -width / 2, z: depth / 2 },
  ];
  return local.map((point) => ({
    x: center.x + point.x * cos + point.z * sin,
    z: center.z - point.x * sin + point.z * cos,
  })) as [Vec2, Vec2, Vec2, Vec2];
}

function project(corners: readonly Vec2[], axis: Vec2): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const corner of corners) {
    const value = corner.x * axis.x + corner.z * axis.z;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  return { min, max };
}

function stacked(left: Footprint, right: Footprint): boolean {
  const leftBase = left.object.transform.position.y;
  const rightBase = right.object.transform.position.y;
  const leftTop = leftBase + (left.object.dimensions?.height ?? 0);
  const rightTop = rightBase + (right.object.dimensions?.height ?? 0);
  return leftBase >= rightTop - OVERLAP_METRES || rightBase >= leftTop - OVERLAP_METRES;
}

function overlaps(left: Footprint, right: Footprint): boolean {
  const edges = [left.corners, right.corners];
  for (const corners of edges) {
    for (let index = 0; index < corners.length; index += 1) {
      const start = corners[index];
      const end = corners[(index + 1) % corners.length];
      if (!start || !end) {
        continue;
      }
      const length = Math.hypot(end.x - start.x, end.z - start.z) || 1;
      const axis = { x: -(end.z - start.z) / length, z: (end.x - start.x) / length };
      const a = project(left.corners, axis);
      const b = project(right.corners, axis);
      const amount = Math.min(a.max, b.max) - Math.max(a.min, b.min);
      if (amount <= OVERLAP_METRES) {
        return false;
      }
    }
  }
  return true;
}

function blocksOpening(footprint: Footprint, start: Vec2, end: Vec2): boolean {
  const mid = { x: (start.x + end.x) / 2, z: (start.z + end.z) / 2 };
  if (pointInPolygon(mid, footprint.corners)) {
    return true;
  }
  for (let index = 0; index < footprint.corners.length; index += 1) {
    const a = footprint.corners[index];
    const b = footprint.corners[(index + 1) % footprint.corners.length];
    if (a && b && segmentIntersection(start, end, a, b, false)) {
      return true;
    }
  }
  return false;
}

function clearWidth(left: Wall, right: Wall): number | null {
  const leftLength = wallLength(left);
  const rightLength = wallLength(right);
  if (leftLength < 0.5 || rightLength < 0.5) {
    return null;
  }
  const ux = (left.end.x - left.start.x) / leftLength;
  const uz = (left.end.z - left.start.z) / leftLength;
  const vx = (right.end.x - right.start.x) / rightLength;
  const vz = (right.end.z - right.start.z) / rightLength;
  if (Math.abs(ux * vx + uz * vz) < 0.98) {
    return null;
  }
  const distance = Math.abs(
    (right.start.x - left.start.x) * -uz + (right.start.z - left.start.z) * ux,
  );
  const clear = distance - left.thickness / 2 - right.thickness / 2;
  if (clear <= 0.05 || clear >= MIN_CLEAR_METRES) {
    return null;
  }
  const along = (point: Vec2) => point.x * ux + point.z * uz;
  const leftSpan = [along(left.start), along(left.end)].sort((a, b) => a - b);
  const rightSpan = [along(right.start), along(right.end)].sort((a, b) => a - b);
  const shared =
    Math.min(leftSpan[1] ?? 0, rightSpan[1] ?? 0) - Math.max(leftSpan[0] ?? 0, rightSpan[0] ?? 0);
  return shared >= 0.5 ? clear : null;
}

/** Planning warnings for one venue. Not a safety or legal certification. */
export function checkVenue(document: VenueDocument): VenueWarning[] {
  const warnings: VenueWarning[] = [];

  for (const floor of document.venue.floors) {
    const rooms = floor.rooms.filter(shown).map((room) => room.boundary);
    const footprints: Footprint[] = floor.objects.filter(shown).map((object) => ({
      object,
      corners: cornersOf(object),
      center: { x: object.transform.position.x, z: object.transform.position.z },
    }));

    for (const footprint of footprints) {
      const size = footprint.object.dimensions;
      if (
        size &&
        (!finiteSize(size.width) || !finiteSize(size.height) || !finiteSize(size.depth))
      ) {
        warnings.push({
          ruleId: "object.invalid-dimensions",
          severity: "error",
          objectIds: [footprint.object.id],
          description: `${footprint.object.name} has a size that cannot be built.`,
          suggestedFix: "Set width, depth, and height to a value between 0 and 100 metres.",
          location: footprint.center,
        });
      }
      if (
        rooms.length > 0 &&
        !rooms.some((boundary) => pointInPolygon(footprint.center, boundary))
      ) {
        warnings.push({
          ruleId: "object.outside-floor",
          severity: "warning",
          objectIds: [footprint.object.id],
          description: `${footprint.object.name} sits outside the room.`,
          suggestedFix: "Move it inside the room boundary.",
          location: footprint.center,
        });
      }
    }

    for (let index = 0; index < footprints.length; index += 1) {
      for (let other = index + 1; other < footprints.length; other += 1) {
        const left = footprints[index];
        const right = footprints[other];
        if (!left || !right || stacked(left, right) || !overlaps(left, right)) {
          continue;
        }
        warnings.push({
          ruleId: "object.overlap",
          severity: "warning",
          objectIds: [left.object.id, right.object.id],
          description: `${left.object.name} overlaps ${right.object.name}.`,
          suggestedFix: "Move one of them so the footprints no longer cross.",
          location: {
            x: (left.center.x + right.center.x) / 2,
            z: (left.center.z + right.center.z) / 2,
          },
        });
      }
    }

    for (const wall of floor.walls.filter(shown)) {
      for (const opening of wall.openings ?? []) {
        if (opening.kind !== "door") {
          continue;
        }
        const span = openingSpan(wall, opening);
        if (!span.valid) {
          continue;
        }
        const blocker = footprints.find((footprint) =>
          blocksOpening(footprint, span.start, span.end),
        );
        if (!blocker) {
          continue;
        }
        warnings.push({
          ruleId: "door.obstructed",
          severity: "warning",
          objectIds: [wall.id, opening.id, blocker.object.id],
          description: `${blocker.object.name} blocks a door.`,
          suggestedFix: "Move the furniture clear of the doorway.",
          location: {
            x: (span.start.x + span.end.x) / 2,
            z: (span.start.z + span.end.z) / 2,
          },
        });
      }
    }

    const walls = floor.walls.filter(shown);
    for (let index = 0; index < walls.length; index += 1) {
      for (let other = index + 1; other < walls.length; other += 1) {
        const left = walls[index];
        const right = walls[other];
        if (!left || !right) {
          continue;
        }
        const clear = clearWidth(left, right);
        if (clear === null) {
          continue;
        }
        warnings.push({
          ruleId: "pathway.narrow",
          severity: "warning",
          objectIds: [left.id, right.id],
          description: `The gap between two walls is ${clear.toFixed(2)} m.`,
          suggestedFix:
            "Widen the gap to at least 0.90 m, or treat it as furniture rather than a route.",
          location: {
            x: (left.start.x + left.end.x + right.start.x + right.end.x) / 4,
            z: (left.start.z + left.end.z + right.start.z + right.end.z) / 4,
          },
        });
      }
    }

    if (walls.length === 0) {
      continue;
    }
    const spawns = document.venue.spawnPoints.filter(
      (spawn) => spawn.floorId === floor.id && shown(spawn),
    );
    const anchor = rooms[0]?.[0] ?? { x: 0, z: 0 };
    if (!spawns.some((spawn) => spawn.role === "visitor")) {
      warnings.push({
        ruleId: "spawn.missing-entrance",
        severity: "warning",
        objectIds: [floor.id],
        description: `${floor.name} has no entrance.`,
        suggestedFix: "Place an Entrance marker inside the hall.",
        location: anchor,
      });
    }
    if (!spawns.some((spawn) => spawn.role === "exit")) {
      warnings.push({
        ruleId: "spawn.missing-exit",
        severity: "warning",
        objectIds: [floor.id],
        description: `${floor.name} has no exit.`,
        suggestedFix: "Place an Exit marker inside the hall.",
        location: anchor,
      });
    }
  }

  return warnings;
}
