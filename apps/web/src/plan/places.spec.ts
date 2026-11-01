import { createEmptyVenue } from "@openvenue/scene-schema";
import { describe, expect, it } from "vitest";
import { mapPlace, mapPlaces } from "./places";

describe("map places", () => {
  it("lists rooms and zones and skips chairs", () => {
    const document = createEmptyVenue();
    const floor = document.venue.floors[0];
    if (!floor) {
      throw new Error("missing floor");
    }
    floor.rooms.push({
      id: "hall",
      name: "Hall",
      boundary: [
        { x: 0, z: 0 },
        { x: 0, z: 4 },
        { x: 4, z: 4 },
        { x: 4, z: 0 },
      ],
    });
    floor.zones.push({
      id: "food",
      type: "zone",
      name: "Food",
      boundary: [
        { x: 0, z: 0 },
        { x: 0, z: 2 },
        { x: 2, z: 2 },
        { x: 2, z: 0 },
      ],
      interaction: { type: "menu", contentRef: "content/food.json" },
    });
    floor.objects.push(
      {
        id: "stage",
        type: "stage",
        name: "Stage",
        transform: { position: { x: 1, y: 0, z: 1 }, rotation: { x: 0, y: 0, z: 0 } },
      },
      {
        id: "chair",
        type: "chair",
        name: "Chair",
        transform: { position: { x: 2, y: 0, z: 2 }, rotation: { x: 0, y: 0, z: 0 } },
      },
    );

    const places = mapPlaces(document);
    expect(places.map((place) => place.name)).toEqual(["Hall", "Food", "Stage"]);
    expect(mapPlace(document, "food")?.detail).toBe("Level 0 · Ground floor · Menu");
    expect(mapPlace(document, "chair")).toBeNull();
  });
});
