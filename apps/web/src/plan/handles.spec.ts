import { describe, expect, it } from "vitest";
import { hitHandle, idsInsideBox, toLocal } from "./handles";
import type { PlanFixture, PlanScene } from "./model";

const table: PlanFixture = {
  id: "table",
  name: "Table",
  type: "table",
  center: { x: 2, z: 3 },
  width: 1.2,
  depth: 0.8,
  yaw: 0,
  points: [],
};

describe("handles", () => {
  it("maps a yaw of zero back to local metres", () => {
    expect(toLocal(table.center, 0, { x: 3, z: 4 })).toEqual({ x: 1, z: 1 });
  });

  it("hits the rotate handle before a corner", () => {
    expect(hitHandle(table, { x: 2, z: 3 + 0.4 + 0.55 })).toBe("rotate");
    expect(hitHandle(table, { x: 2 + 0.6, z: 3 + 0.4 })).toBe("resize");
    expect(hitHandle(table, { x: 2, z: 3 })).toBeNull();
  });

  it("selects fixtures whose centers lie in the box", () => {
    const scene = {
      objects: [table],
      spawns: [],
      rooms: [],
      zones: [],
      walls: [],
      openings: [],
      points: [],
    } satisfies PlanScene;
    expect(idsInsideBox(scene, { x: 0, z: 0 }, { x: 4, z: 4 })).toEqual(["table"]);
    expect(idsInsideBox(scene, { x: 5, z: 5 }, { x: 6, z: 6 })).toEqual([]);
  });
});
