import { polygonSelfIntersects } from "./polygon.js";
import { openingSpan, wallLength, type OpeningPlacement, type WallLine } from "./wall.js";
import { LENGTH_EPSILON, type Vec2 } from "./vec.js";

export type GeometrySeverity = "error" | "warning";

export interface GeometryIssue {
  ruleId:
    | "wall.zero-length"
    | "wall.zero-thickness"
    | "room.self-intersection"
    | "room.too-few-points"
    | "opening.out-of-range";
  severity: GeometrySeverity;
  message: string;
  objectIds: string[];
}

export interface WallToValidate extends WallLine {
  id: string;
  thickness: number;
  height: number;
  openings?: readonly (OpeningPlacement & { id: string })[];
}

export function validateWall(wall: WallToValidate): GeometryIssue[] {
  const issues: GeometryIssue[] = [];
  if (wallLength(wall) <= LENGTH_EPSILON) {
    issues.push({
      ruleId: "wall.zero-length",
      severity: "error",
      message: "Wall length must be greater than zero.",
      objectIds: [wall.id],
    });
  }
  if (wall.thickness <= 0) {
    issues.push({
      ruleId: "wall.zero-thickness",
      severity: "error",
      message: "Wall thickness must be greater than zero.",
      objectIds: [wall.id],
    });
  }
  for (const opening of wall.openings ?? []) {
    if (!openingSpan(wall, opening).valid) {
      issues.push({
        ruleId: "opening.out-of-range",
        severity: "error",
        message: "Opening does not lie on the wall.",
        objectIds: [wall.id, opening.id],
      });
    }
  }
  return issues;
}

export function validateRoomBoundary(roomId: string, boundary: readonly Vec2[]): GeometryIssue[] {
  if (boundary.length < 3) {
    return [
      {
        ruleId: "room.too-few-points",
        severity: "error",
        message: "A room needs at least three boundary points.",
        objectIds: [roomId],
      },
    ];
  }
  if (polygonSelfIntersects(boundary)) {
    return [
      {
        ruleId: "room.self-intersection",
        severity: "error",
        message: "Room boundary crosses itself.",
        objectIds: [roomId],
      },
    ];
  }
  return [];
}

export function validateGeometry(input: {
  walls?: readonly WallToValidate[];
  rooms?: readonly { id: string; boundary: readonly Vec2[] }[];
}): GeometryIssue[] {
  const issues: GeometryIssue[] = [];
  for (const wall of input.walls ?? []) {
    issues.push(...validateWall(wall));
  }
  for (const room of input.rooms ?? []) {
    issues.push(...validateRoomBoundary(room.id, room.boundary));
  }
  return issues;
}
