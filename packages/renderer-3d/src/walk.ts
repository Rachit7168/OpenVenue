/** Movement and collision for a first-person visitor. The camera only reads the result. */

export const WALK_SPEED = 1.6;
export const PERSON_RADIUS = 0.25;
export const DEFAULT_EYE_HEIGHT = 1.6;
export const MIN_EYE_HEIGHT = 0.4;
export const MAX_EYE_HEIGHT = 2.4;
export const PITCH_LIMIT = Math.PI / 2 - 0.05;
const LOOK_SENSITIVITY = 0.002;

export interface WalkWall {
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  thickness: number;
}

export interface WalkOpening {
  kind: string;
  offset: number;
  width: number;
}

export interface WalkCollider {
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  thickness: number;
  openings?: readonly WalkOpening[];
}

export interface Walker {
  x: number;
  z: number;
  yaw: number;
  pitch: number;
}

export interface WalkAxes {
  /** Positive walks the way the visitor is looking. */
  forward: number;
  /** Positive strafes to the visitor's right. */
  strafe: number;
}

export function clampEyeHeight(height: number): number {
  if (!Number.isFinite(height)) {
    return DEFAULT_EYE_HEIGHT;
  }
  return Math.min(MAX_EYE_HEIGHT, Math.max(MIN_EYE_HEIGHT, height));
}

export function clampPitch(pitch: number): number {
  if (!Number.isFinite(pitch)) {
    return 0;
  }
  return Math.min(PITCH_LIMIT, Math.max(-PITCH_LIMIT, pitch));
}

/** Mouse look. `dx` and `dy` are pixels, positive right and down. */
export function applyLook(
  yaw: number,
  pitch: number,
  dx: number,
  dy: number,
  sensitivity = LOOK_SENSITIVITY,
): { yaw: number; pitch: number } {
  return {
    yaw: yaw - dx * sensitivity,
    pitch: clampPitch(pitch - dy * sensitivity),
  };
}

/**
 * Solid pieces of each wall. Doors and plain openings are gaps a visitor can
 * walk through. Windows stay solid.
 */
export function collisionSegments(walls: readonly WalkCollider[]): WalkWall[] {
  const segments: WalkWall[] = [];
  for (const wall of walls) {
    const length = Math.hypot(wall.endX - wall.startX, wall.endZ - wall.startZ);
    if (length < 1e-6) {
      continue;
    }
    const gaps = (wall.openings ?? [])
      .filter((opening) => opening.kind === "door" || opening.kind === "opening")
      .map((opening) => ({
        start: Math.max(0, opening.offset),
        end: Math.min(length, opening.offset + opening.width),
      }))
      .filter((gap) => gap.end - gap.start > 1e-4)
      .sort((a, b) => a.start - b.start);
    let cursor = 0;
    const push = (from: number, to: number) => {
      if (to - from < 1e-4) {
        return;
      }
      segments.push({
        startX: pointOnWall(wall, from / length).x,
        startZ: pointOnWall(wall, from / length).z,
        endX: pointOnWall(wall, to / length).x,
        endZ: pointOnWall(wall, to / length).z,
        thickness: wall.thickness,
      });
    };
    for (const gap of gaps) {
      push(cursor, gap.start);
      cursor = Math.max(cursor, gap.end);
    }
    push(cursor, length);
  }
  return segments;
}

/** Stand just inside the hall when a spawn sits on a corner, facing open floor. */
export function spawnWalker(
  position: { x: number; z: number },
  rotationY: number,
  walls: readonly WalkWall[],
): Walker {
  const stood = freeWalker(
    {
      x: position.x + 0.6,
      z: position.z + 0.6,
      yaw: Number.isFinite(rotationY) ? rotationY : 0,
      pitch: 0,
    },
    walls,
  );
  return faceOpenSpace(stood, walls);
}

function faceOpenSpace(walker: Walker, walls: readonly WalkWall[]): Walker {
  let bestYaw = walker.yaw;
  let bestClearance = -1;
  for (const yaw of [walker.yaw, 0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    let ahead = { ...walker, yaw };
    for (let step = 0; step < 8; step += 1) {
      ahead = stepWalker(ahead, { forward: 1, strafe: 0 }, walls, 0.05);
    }
    const clearance = Math.hypot(ahead.x - walker.x, ahead.z - walker.z);
    if (clearance > bestClearance + 1e-3) {
      bestClearance = clearance;
      bestYaw = yaw;
    }
  }
  return { ...walker, yaw: bestYaw };
}

export function stepWalker(
  walker: Walker,
  axes: WalkAxes,
  walls: readonly WalkWall[],
  dt: number,
  speed = WALK_SPEED,
): Walker {
  const seconds = Number.isFinite(dt) ? Math.min(Math.max(dt, 0), 0.2) : 0;
  let x = walker.x;
  let z = walker.z;
  let remaining = seconds;
  const magnitude = Math.hypot(axes.forward, axes.strafe);
  const forward = magnitude > 1 ? axes.forward / magnitude : axes.forward;
  const strafe = magnitude > 1 ? axes.strafe / magnitude : axes.strafe;
  const stepX = -Math.sin(walker.yaw) * forward + Math.cos(walker.yaw) * strafe;
  const stepZ = -Math.cos(walker.yaw) * forward - Math.sin(walker.yaw) * strafe;
  while (remaining > 1e-6) {
    const slice = Math.min(remaining, 0.05);
    x += stepX * speed * slice;
    z += stepZ * speed * slice;
    const solved = resolvePosition(x, z, walls);
    x = solved.x;
    z = solved.z;
    remaining -= slice;
  }
  return { x, z, yaw: walker.yaw, pitch: walker.pitch };
}

function freeWalker(walker: Walker, walls: readonly WalkWall[]): Walker {
  let x = walker.x;
  let z = walker.z;
  for (let pass = 0; pass < 8; pass += 1) {
    const solved = resolvePosition(x, z, walls);
    if (Math.hypot(solved.x - x, solved.z - z) < 1e-4) {
      return { ...walker, x: solved.x, z: solved.z };
    }
    x = solved.x;
    z = solved.z;
  }
  return { ...walker, x, z };
}

function resolvePosition(
  x: number,
  z: number,
  walls: readonly WalkWall[],
): { x: number; z: number } {
  let nextX = x;
  let nextZ = z;
  for (let pass = 0; pass < 3; pass += 1) {
    for (const wall of walls) {
      const radius = Math.max(wall.thickness, 0) / 2 + PERSON_RADIUS;
      const closest = closestPoint(nextX, nextZ, wall);
      let dx = nextX - closest.x;
      let dz = nextZ - closest.z;
      let distance = Math.hypot(dx, dz);
      if (distance >= radius) {
        continue;
      }
      if (distance < 1e-6) {
        const length = Math.hypot(wall.endX - wall.startX, wall.endZ - wall.startZ) || 1;
        dx = -(wall.endZ - wall.startZ) / length;
        dz = (wall.endX - wall.startX) / length;
        distance = 1;
      }
      const push = radius - distance + 1e-4;
      nextX += (dx / distance) * push;
      nextZ += (dz / distance) * push;
    }
  }
  return { x: nextX, z: nextZ };
}

function closestPoint(x: number, z: number, wall: WalkWall): { x: number; z: number } {
  const dx = wall.endX - wall.startX;
  const dz = wall.endZ - wall.startZ;
  const lengthSq = dx * dx + dz * dz;
  if (lengthSq < 1e-8) {
    return { x: wall.startX, z: wall.startZ };
  }
  const t = Math.min(1, Math.max(0, ((x - wall.startX) * dx + (z - wall.startZ) * dz) / lengthSq));
  return { x: wall.startX + dx * t, z: wall.startZ + dz * t };
}

function pointOnWall(wall: WalkCollider, t: number): { x: number; z: number } {
  return {
    x: wall.startX + (wall.endX - wall.startX) * t,
    z: wall.startZ + (wall.endZ - wall.startZ) * t,
  };
}
