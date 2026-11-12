import { createEmptyVenue, type VenueDocument } from "@openvenue/scene-schema";
import { describe, expect, it } from "vitest";
import { directory, liveSummary, parseContent, visitorSpawn, zoneAt } from "./visitor.js";

function hall(): VenueDocument {
  const document = createEmptyVenue("Hall");
  const floor = document.venue.floors[0];
  if (!floor) {
    throw new Error("missing floor");
  }
  floor.zones.push({
    id: "6f1c2a40-7b2e-4c1a-9d3e-1a2b3c4d5e41",
    type: "zone",
    name: "Food court",
    boundary: [
      { x: 0, z: 0 },
      { x: 4, z: 0 },
      { x: 4, z: 4 },
      { x: 0, z: 4 },
    ],
    interaction: { type: "menu", contentRef: "content/food-court.json" },
  });
  document.venue.spawnPoints = [
    {
      id: "6f1c2a40-7b2e-4c1a-9d3e-1a2b3c4d5e42",
      name: "Door",
      floorId: floor.id,
      position: { x: 1, y: 0, z: 1 },
      rotationY: 0.5,
      role: "visitor",
    },
  ];
  return document;
}

describe("visitor helpers", () => {
  it("starts at the visitor spawn and finds the zone under a point", () => {
    const document = hall();
    expect(visitorSpawn(document)).toMatchObject({ x: 1, z: 1, yaw: 0.5 });
    expect(zoneAt(document, document.venue.floors[0]!.id, { x: 2, z: 2 })?.name).toBe("Food court");
    expect(zoneAt(document, document.venue.floors[0]!.id, { x: 9, z: 9 })).toBeUndefined();
  });

  it("lists destinations and reads session status", () => {
    const entries = directory(hall());
    expect(entries[0]).toMatchObject({ name: "Food court", x: 2, z: 2 });
    const content = parseContent({
      title: "Food court",
      kind: "session-list",
      sessions: [{ name: "Lunch", status: "busy", queueMinutes: 8 }],
    });
    expect(liveSummary(content)).toBe("Lunch: busy, 8 min");
  });
});
