import { createEmptyVenue, type VenueDocument } from "@openvenue/scene-schema";
import { describe, expect, it } from "vitest";
import { findCategories, mapPlaces, searchPlaces, zoneMapColor } from "./map.js";

function demo(): VenueDocument {
  const document = createEmptyVenue("Campus");
  const ground = document.venue.floors[0]!;
  ground.level = 0;
  ground.name = "Ground";
  ground.zones.push(
    {
      id: "6f1c2a40-7b2e-4c1a-9d3e-1a2b3c4d5e51",
      type: "zone",
      name: "Jasmine Stage 4",
      category: "stages",
      icon: "stage",
      mapColor: "#93c5fd",
      blurb: "Talks and panels.",
      boundary: [
        { x: 0, z: 0 },
        { x: 4, z: 0 },
        { x: 4, z: 4 },
        { x: 0, z: 4 },
      ],
    },
    {
      id: "6f1c2a40-7b2e-4c1a-9d3e-1a2b3c4d5e52",
      type: "zone",
      name: "Food Court",
      category: "food-drink",
      icon: "food",
      blurb: "Lunch",
      boundary: [
        { x: 6, z: 0 },
        { x: 10, z: 0 },
        { x: 10, z: 4 },
        { x: 6, z: 4 },
      ],
    },
  );
  document.venue.floors.push({
    id: "6f1c2a40-7b2e-4c1a-9d3e-1a2b3c4d5e53",
    name: "Level 2",
    level: 2,
    elevation: 8,
    height: 4,
    rooms: [],
    walls: [],
    objects: [],
    zones: [
      {
        id: "6f1c2a40-7b2e-4c1a-9d3e-1a2b3c4d5e54",
        type: "zone",
        name: "Gnosis",
        category: "supporters",
        icon: "booth",
        boundary: [
          { x: 0, z: 0 },
          { x: 3, z: 0 },
          { x: 3, z: 3 },
          { x: 0, z: 3 },
        ],
      },
    ],
  });
  return document;
}

describe("map helpers", () => {
  it("groups Find categories by floor and searches places", () => {
    const document = demo();
    const categories = findCategories(document);
    expect(categories.find((item) => item.id === "stages")?.count).toBe(1);
    expect(categories.find((item) => item.id === "food-drink")?.count).toBe(1);
    expect(searchPlaces(document, "gnosis")[0]?.name).toBe("Gnosis");
    expect(searchPlaces(document, "level 2")[0]?.name).toBe("Gnosis");
    expect(mapPlaces(document)).toHaveLength(3);
  });

  it("uses mapColor then category defaults", () => {
    const document = demo();
    const stage = document.venue.floors[0]!.zones[0]!;
    expect(zoneMapColor(stage)).toBe("#93c5fd");
    const food = document.venue.floors[0]!.zones[1]!;
    expect(zoneMapColor(food)).toBe("#86efac");
  });
});
