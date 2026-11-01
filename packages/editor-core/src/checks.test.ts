import { createEmptyVenue } from "@openvenue/scene-schema";
import { describe, expect, it } from "vitest";
import { CHECK_NOTE, checkVenue } from "./checks.js";

function hall() {
  const document = createEmptyVenue("Hall");
  const floor = document.venue.floors[0];
  if (!floor) {
    throw new Error("missing floor");
  }
  floor.rooms.push({
    id: "room-1",
    name: "Hall",
    boundary: [
      { x: 0, z: 0 },
      { x: 0, z: 8 },
      { x: 10, z: 8 },
      { x: 10, z: 0 },
    ],
    wallIds: ["wall-south", "wall-north"],
  });
  floor.walls.push(
    {
      id: "wall-south",
      start: { x: 10, z: 0 },
      end: { x: 0, z: 0 },
      thickness: 0.2,
      height: 3,
      openings: [{ id: "door-1", kind: "door", offset: 4.3, width: 1.4, height: 2.1, sill: 0 }],
    },
    {
      id: "wall-north",
      start: { x: 0, z: 8 },
      end: { x: 10, z: 8 },
      thickness: 0.2,
      height: 3,
    },
  );
  document.venue.spawnPoints.push({
    id: "exit-1",
    name: "Exit",
    floorId: floor.id,
    position: { x: 8, y: 0, z: 1 },
    rotationY: 0,
    role: "exit",
  });
  return { document, floor };
}

describe("venue checks", () => {
  it("stays quiet for an empty project and a furnished hall", () => {
    expect(checkVenue(createEmptyVenue())).toEqual([]);
    const { document, floor } = hall();
    floor.objects.push(
      {
        id: "table-1",
        type: "table",
        name: "Table",
        transform: {
          position: { x: 5, y: 0, z: 4 },
          rotation: { x: 0, y: 0, z: 0 },
        },
        dimensions: { width: 1.2, height: 0.75, depth: 0.8 },
      },
      {
        id: "stage-1",
        type: "stage",
        name: "Stage",
        transform: {
          position: { x: 5, y: 0, z: 6 },
          rotation: { x: 0, y: 0, z: 0 },
        },
        dimensions: { width: 4, height: 0.4, depth: 2 },
      },
      {
        id: "podium-1",
        type: "stage",
        name: "Podium",
        transform: {
          position: { x: 5, y: 0.4, z: 6 },
          rotation: { x: 0, y: 0, z: 0 },
        },
        dimensions: { width: 0.6, height: 1.06, depth: 0.5 },
      },
    );
    expect(checkVenue(document)).toEqual([]);
    expect(CHECK_NOTE).toMatch(/not a safety/);
  });

  it("reports each planning rule with a fix and a location", () => {
    const { document, floor } = hall();
    document.venue.spawnPoints = document.venue.spawnPoints.filter(
      (spawn) => spawn.role !== "visitor",
    );
    floor.objects.push(
      {
        id: "outside",
        type: "table",
        name: "Outside",
        transform: {
          position: { x: 20, y: 0, z: 20 },
          rotation: { x: 0, y: 0, z: 0 },
        },
        dimensions: { width: 1, height: 0.75, depth: 1 },
      },
      {
        id: "broken",
        type: "table",
        name: "Broken",
        transform: {
          position: { x: 2, y: 0, z: 2 },
          rotation: { x: 0, y: 0, z: 0 },
        },
        dimensions: { width: 0, height: 0.75, depth: 1 },
      },
      {
        id: "left",
        type: "table",
        name: "Left",
        transform: {
          position: { x: 4, y: 0, z: 4 },
          rotation: { x: 0, y: 0, z: 0 },
        },
        dimensions: { width: 2, height: 0.75, depth: 2 },
      },
      {
        id: "right",
        type: "table",
        name: "Right",
        transform: {
          position: { x: 4.5, y: 0, z: 4 },
          rotation: { x: 0, y: 0, z: 0 },
        },
        dimensions: { width: 2, height: 0.75, depth: 2 },
      },
      {
        id: "blocker",
        type: "table",
        name: "Blocker",
        transform: {
          position: { x: 5, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
        },
        dimensions: { width: 1.2, height: 0.75, depth: 1.2 },
      },
    );
    floor.walls.push(
      {
        id: "gap-a",
        start: { x: 0, z: 1 },
        end: { x: 4, z: 1 },
        thickness: 0.2,
        height: 3,
      },
      {
        id: "gap-b",
        start: { x: 0, z: 1.6 },
        end: { x: 4, z: 1.6 },
        thickness: 0.2,
        height: 3,
      },
    );

    const warnings = checkVenue(document);
    const rules = warnings.map((warning) => warning.ruleId);
    expect(rules).toContain("object.outside-floor");
    expect(rules).toContain("object.invalid-dimensions");
    expect(rules).toContain("object.overlap");
    expect(rules).toContain("door.obstructed");
    expect(rules).toContain("pathway.narrow");
    expect(rules).toContain("spawn.missing-entrance");
    expect(rules).not.toContain("spawn.missing-exit");
    for (const warning of warnings) {
      expect(warning.suggestedFix.length).toBeGreaterThan(0);
      expect(Number.isFinite(warning.location.x)).toBe(true);
      expect(Number.isFinite(warning.location.z)).toBe(true);
    }
    expect(
      warnings.find((warning) => warning.ruleId === "object.invalid-dimensions")?.severity,
    ).toBe("error");
  });
});
