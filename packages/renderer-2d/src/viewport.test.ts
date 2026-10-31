import { describe, expect, it } from "vitest";
import {
  fitViewport,
  footprintCorners,
  gridLines,
  panViewport,
  screenToWorld,
  worldToScreen,
  zoomViewport,
} from "./viewport.js";

describe("viewport", () => {
  it("maps plan metres onto the screen with +Z up", () => {
    const viewport = { scale: 10, originX: 100, originY: 80 };
    expect(worldToScreen(viewport, { x: 2, z: 3 })).toEqual({ x: 120, y: 50 });
    expect(screenToWorld(viewport, { x: 120, y: 50 })).toEqual({ x: 2, z: 3 });
  });

  it("keeps the cursor world point fixed while zooming", () => {
    const viewport = { scale: 10, originX: 0, originY: 200 };
    const anchor = worldToScreen(viewport, { x: 4, z: 2 });
    const zoomed = zoomViewport(viewport, anchor, 2);
    const world = screenToWorld(zoomed, anchor);
    expect(world.x).toBeCloseTo(4);
    expect(world.z).toBeCloseTo(2);
    expect(zoomed.scale).toBe(20);
  });

  it("pans in screen pixels and fits a hall into the view", () => {
    const panned = panViewport({ scale: 10, originX: 0, originY: 0 }, 15, -5);
    expect(panned).toEqual({ scale: 10, originX: 15, originY: -5 });

    const fitted = fitViewport(
      [
        { x: 0, z: 0 },
        { x: 10, z: 0 },
        { x: 10, z: 8 },
        { x: 0, z: 8 },
      ],
      200,
      200,
      20,
    );
    const center = worldToScreen(fitted, { x: 5, z: 4 });
    expect(center.x).toBeCloseTo(100);
    expect(center.y).toBeCloseTo(100);
    expect(gridLines(fitted, 200, 200, 0.5).lines.length).toBeGreaterThan(4);
  });

  it("turns a yaw of zero into a width-by-depth rectangle", () => {
    const corners = footprintCorners({ x: 1, z: 2 }, 2, 1, 0);
    expect(corners[0]).toEqual({ x: 0, z: 1.5 });
    expect(corners[1]).toEqual({ x: 2, z: 1.5 });
    expect(corners[2]).toEqual({ x: 2, z: 2.5 });
  });
});
