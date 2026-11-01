import type { Interaction, VenueDocument } from "@openvenue/scene-schema";

export interface MapPlace {
  id: string;
  name: string;
  floorId: string;
  floorName: string;
  level: number;
  kind: "room" | "zone" | "object";
  detail: string;
}

function interactionDetail(interaction: Interaction | undefined): string {
  switch (interaction?.type) {
    case "info-panel":
      return "Info";
    case "link":
      return "Link";
    case "menu":
      return "Menu";
    case "session-list":
      return "Sessions";
    default:
      return "Zone";
  }
}

/** Rooms, zones, and named furniture a person can open from the map. Chairs stay off the list. */
export function mapPlaces(document: VenueDocument): MapPlace[] {
  const floors = [...document.venue.floors].sort(
    (left, right) => left.level - right.level || left.elevation - right.elevation,
  );
  const places: MapPlace[] = [];
  for (const floor of floors) {
    const level = `Level ${floor.level} · ${floor.name}`;
    for (const room of floor.rooms) {
      places.push({
        id: room.id,
        name: room.name,
        floorId: floor.id,
        floorName: floor.name,
        level: floor.level,
        kind: "room",
        detail: level,
      });
    }
    for (const zone of floor.zones) {
      places.push({
        id: zone.id,
        name: zone.name,
        floorId: floor.id,
        floorName: floor.name,
        level: floor.level,
        kind: "zone",
        detail: `${level} · ${interactionDetail(zone.interaction)}`,
      });
    }
    for (const object of floor.objects) {
      if (object.type === "chair") {
        continue;
      }
      places.push({
        id: object.id,
        name: object.name,
        floorId: floor.id,
        floorName: floor.name,
        level: floor.level,
        kind: "object",
        detail: `${level} · ${object.type}`,
      });
    }
  }
  return places;
}

export function mapPlace(document: VenueDocument, id: string | undefined): MapPlace | null {
  if (!id) {
    return null;
  }
  return mapPlaces(document).find((place) => place.id === id) ?? null;
}
