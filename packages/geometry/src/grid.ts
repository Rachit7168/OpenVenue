import { distance, quantize, type Vec2 } from "./vec.js";

export interface GridSettings {
  /** Grid spacing in metres. */
  size: number;
  /** Quantization step in metres. */
  precision: number;
}

export const DEFAULT_GRID: GridSettings = {
  size: 0.5,
  precision: 0.01,
};

export const DEFAULT_ENDPOINT_TOLERANCE = 0.25;
export const DEFAULT_WALL_TOLERANCE = 0.25;

export interface SnapWall {
  id: string;
  start: Vec2;
  end: Vec2;
}

export interface SnapOptions {
  grid?: GridSettings;
  endpointTolerance?: number;
  wallTolerance?: number;
  gridEnabled?: boolean;
  endpointsEnabled?: boolean;
  wallsEnabled?: boolean;
}

export interface SnapResult {
  point: Vec2;
  kind: "endpoint" | "wall" | "grid";
  wallId?: string;
}

function assertGrid(grid: GridSettings): void {
  if (!Number.isFinite(grid.size) || !(grid.size > 0)) {
    throw new Error("grid size must be a positive finite number");
  }
  if (!Number.isFinite(grid.precision) || !(grid.precision > 0)) {
    throw new Error("grid precision must be a positive finite number");
  }
  const steps = grid.size / grid.precision;
  if (Math.abs(steps - Math.round(steps)) > 1e-6) {
    throw new Error("grid size must be a multiple of precision");
  }
}

export function snapToGrid(point: Vec2, grid: GridSettings = DEFAULT_GRID): Vec2 {
  assertGrid(grid);
  return {
    x: quantize(Math.round(point.x / grid.size) * grid.size, grid.precision),
    z: quantize(Math.round(point.z / grid.size) * grid.size, grid.precision),
  };
}

interface EndpointCandidate {
  point: Vec2;
  distance: number;
  wallId: string;
  which: "start" | "end";
}

function closerEndpoint(a: EndpointCandidate, b: EndpointCandidate): EndpointCandidate {
  if (a.distance !== b.distance) {
    return a.distance < b.distance ? a : b;
  }
  if (a.wallId !== b.wallId) {
    return a.wallId < b.wallId ? a : b;
  }
  return a.which === "start" ? a : b;
}

function closestEndpoint(
  point: Vec2,
  walls: readonly SnapWall[],
  tolerance: number,
): EndpointCandidate | null {
  let best: EndpointCandidate | null = null;
  for (const wall of walls) {
    for (const which of ["start", "end"] as const) {
      const candidate = wall[which];
      const candidateDistance = distance(point, candidate);
      if (candidateDistance > tolerance) {
        continue;
      }
      const next: EndpointCandidate = {
        point: { x: candidate.x, z: candidate.z },
        distance: candidateDistance,
        wallId: wall.id,
        which,
      };
      best = best === null ? next : closerEndpoint(best, next);
    }
  }
  return best;
}

interface WallCandidate {
  point: Vec2;
  distance: number;
  wallId: string;
}

function closestWall(
  point: Vec2,
  walls: readonly SnapWall[],
  tolerance: number,
): WallCandidate | null {
  let best: WallCandidate | null = null;
  for (const wall of walls) {
    const dx = wall.end.x - wall.start.x;
    const dz = wall.end.z - wall.start.z;
    const lengthSquared = dx * dx + dz * dz;
    if (lengthSquared <= 1e-18) {
      continue;
    }
    const t = Math.min(
      1,
      Math.max(0, ((point.x - wall.start.x) * dx + (point.z - wall.start.z) * dz) / lengthSquared),
    );
    const projected = { x: wall.start.x + t * dx, z: wall.start.z + t * dz };
    const projectedDistance = distance(point, projected);
    if (projectedDistance > tolerance) {
      continue;
    }
    const next: WallCandidate = {
      point: projected,
      distance: projectedDistance,
      wallId: wall.id,
    };
    if (
      best === null ||
      next.distance < best.distance ||
      (next.distance === best.distance && next.wallId < best.wallId)
    ) {
      best = next;
    }
  }
  return best;
}

/**
 * Snap priority is endpoint, then wall, then grid.
 * Ties use the smaller wall id, and a wall start beats its end.
 */
export function snapPoint(
  point: Vec2,
  walls: readonly SnapWall[] = [],
  options: SnapOptions = {},
): SnapResult {
  const grid = options.grid ?? DEFAULT_GRID;
  const endpointTolerance = options.endpointTolerance ?? DEFAULT_ENDPOINT_TOLERANCE;
  const wallTolerance = options.wallTolerance ?? DEFAULT_WALL_TOLERANCE;

  if (options.endpointsEnabled !== false) {
    const endpoint = closestEndpoint(point, walls, endpointTolerance);
    if (endpoint) {
      return { point: endpoint.point, kind: "endpoint", wallId: endpoint.wallId };
    }
  }

  if (options.wallsEnabled !== false) {
    const wall = closestWall(point, walls, wallTolerance);
    if (wall) {
      return { point: wall.point, kind: "wall", wallId: wall.wallId };
    }
  }

  if (options.gridEnabled === false) {
    return { point: { x: point.x, z: point.z }, kind: "grid" };
  }

  return { point: snapToGrid(point, grid), kind: "grid" };
}
