import type { VenueDocument } from "./generated/venue.js";

const COORDINATE_SYSTEM = {
  lengthUnit: "metres",
  upAxis: "Y",
  handedness: "right",
  angleUnit: "radians",
} as const;

/** A valid venue with one ground floor and a visitor spawn at the origin. */
export function createEmptyVenue(name = "Untitled venue", now = new Date()): VenueDocument {
  const timestamp = now.toISOString();
  const floorId = crypto.randomUUID();

  return {
    schemaVersion: "1.0.0",
    project: {
      id: crypto.randomUUID(),
      name,
      metadata: {
        createdAt: timestamp,
        updatedAt: timestamp,
        description: "",
        generator: "openvenue",
      },
    },
    coordinateSystem: COORDINATE_SYSTEM,
    assets: [],
    venue: {
      id: crypto.randomUUID(),
      name,
      floors: [
        {
          id: floorId,
          name: "Ground floor",
          level: 0,
          elevation: 0,
          height: 3,
          rooms: [],
          walls: [],
          objects: [],
          zones: [],
        },
      ],
      spawnPoints: [
        {
          id: crypto.randomUUID(),
          name: "Entrance",
          floorId,
          position: { x: 0, y: 0, z: 0 },
          rotationY: 0,
          role: "visitor",
        },
      ],
    },
  };
}
