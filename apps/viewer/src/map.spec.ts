import { createEmptyVenue, type VenueDocument } from "@openvenue/scene-schema";
import { describe, expect, it } from "vitest";
import {
  findCategories,
  floorsForChrome,
  mapPlaces,
  mergePlaceDetails,
  safeExternalHref,
  searchPlaces,
  zoneMapColor,
} from "./map.js";

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
      mapColor: "#112233",
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
    {
      id: "6f1c2a40-7b2e-4c1a-9d3e-1a2b3c4d5e55",
      type: "zone",
      name: "Hidden lounge",
      category: "cowork",
      visible: false,
      boundary: [
        { x: 12, z: 0 },
        { x: 14, z: 0 },
        { x: 14, z: 2 },
        { x: 12, z: 2 },
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
      {
        id: "6f1c2a40-7b2e-4c1a-9d3e-1a2b3c4d5e56",
        type: "zone",
        name: "Press room",
        category: "media-suite",
        boundary: [
          { x: 4, z: 0 },
          { x: 7, z: 0 },
          { x: 7, z: 3 },
          { x: 4, z: 3 },
        ],
        links: [
          { label: "Site", href: "https://example.com" },
          { label: "Bad", href: "javascript:alert(1)" },
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
    expect(categories.find((item) => item.id === "media-suite")?.label).toBe("Media Suite");
    expect(searchPlaces(document, "gnosis")[0]?.name).toBe("Gnosis");
    expect(searchPlaces(document, "level 2")[0]?.name).toBe("Gnosis");
    expect(mapPlaces(document).some((place) => place.name === "Hidden lounge")).toBe(false);
    expect(mapPlaces(document)).toHaveLength(4);
  });

  it("uses mapColor then category defaults and sanitizes links", () => {
    const document = demo();
    const stage = document.venue.floors[0]!.zones[0]!;
    expect(zoneMapColor(stage)).toBe("#112233");
    const food = document.venue.floors[0]!.zones[1]!;
    expect(zoneMapColor(food)).toBe("#86efac");
    expect(safeExternalHref("javascript:alert(1)")).toBeNull();
    expect(safeExternalHref("https://example.com/x")).toBe("https://example.com/x");
    const press = mapPlaces(document).find((place) => place.name === "Press room");
    expect(press?.links.map((link) => link.href)).toEqual(["https://example.com"]);
    const merged = mergePlaceDetails(press!, {
      body: "From content",
      links: [{ label: "More", href: "https://example.com/more" }],
    });
    expect(merged.body).toBe("From content");
    expect(merged.links.map((link) => link.href)).toEqual([
      "https://example.com/more",
      "https://example.com",
    ]);
  });

  it("orders floor chrome from top level down and ignores empty search", () => {
    const document = demo();
    expect(floorsForChrome(document).map((floor) => floor.label)).toEqual(["L2", "L0"]);
    expect(searchPlaces(document, "   ")).toEqual([]);
  });
});
