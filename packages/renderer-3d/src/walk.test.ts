import { describe, expect, it } from "vitest";
import {
  applyLook,
  collisionSegments,
  PITCH_LIMIT,
  spawnWalker,
  stepWalker,
  type WalkWall,
} from "./walk.js";

const hall: WalkWall[] = [
  { startX: 0, startZ: 0, endX: 10, endZ: 0, thickness: 0.2 },
  { startX: 10, startZ: 0, endX: 10, endZ: 8, thickness: 0.2 },
  { startX: 10, startZ: 8, endX: 0, endZ: 8, thickness: 0.2 },
  { startX: 0, startZ: 8, endX: 0, endZ: 0, thickness: 0.2 },
];

describe("first-person walking", () => {
  it("walks forward and looks without pitching past straight up", () => {
    const started = { x: 5, z: 4, yaw: 0, pitch: 0 };
    const walked = stepWalker(started, { forward: 1, strafe: 0 }, [], 1);
    expect(walked.z).toBeLessThan(started.z);
    expect(walked.x).toBeCloseTo(started.x);
    const looked = applyLook(0, 0, 0, -10_000);
    expect(looked.pitch).toBeCloseTo(PITCH_LIMIT);
  });

  it("slides along a wall instead of passing through it", () => {
    let walker = { x: 5, z: 1, yaw: 0, pitch: 0 };
    for (let step = 0; step < 40; step += 1) {
      walker = stepWalker(walker, { forward: 1, strafe: 0 }, hall, 0.05);
    }
    expect(walker.z).toBeGreaterThan(0.3);
    const along = stepWalker(walker, { forward: 0, strafe: 1 }, hall, 0.5);
    expect(along.x).toBeGreaterThan(walker.x);
    expect(along.z).toBeGreaterThan(0.3);
  });

  it("lets a visitor through a door and keeps the rest of the wall solid", () => {
    const walls = collisionSegments([
      {
        startX: 0,
        startZ: 0,
        endX: 4,
        endZ: 0,
        thickness: 0.2,
        openings: [{ kind: "door", offset: 1.5, width: 1 }],
      },
    ]);
    expect(walls).toHaveLength(2);
    let through = { x: 2, z: 1, yaw: 0, pitch: 0 };
    for (let step = 0; step < 30; step += 1) {
      through = stepWalker(through, { forward: 1, strafe: 0 }, walls, 0.05);
    }
    expect(through.z).toBeLessThan(0);
    let blocked = { x: 0.4, z: 1, yaw: 0, pitch: 0 };
    for (let step = 0; step < 30; step += 1) {
      blocked = stepWalker(blocked, { forward: 1, strafe: 0 }, walls, 0.05);
    }
    expect(blocked.z).toBeGreaterThan(0.3);
  });

  it("starts a corner spawn inside the hall", () => {
    const walker = spawnWalker({ x: 0, z: 0 }, 0, hall);
    expect(walker.x).toBeGreaterThan(0.4);
    expect(walker.z).toBeGreaterThan(0.4);
    expect(walker.x).toBeLessThan(9);
    expect(walker.z).toBeLessThan(7);
    let ahead = walker;
    for (let step = 0; step < 20; step += 1) {
      ahead = stepWalker(ahead, { forward: 1, strafe: 0 }, hall, 0.05);
    }
    expect(Math.hypot(ahead.x - walker.x, ahead.z - walker.z)).toBeGreaterThan(1);
  });
});
