import type { VenueDocument } from "./generated/venue.js";

function claimId(seen: Map<string, string>, issues: string[], id: string, label: string): void {
  const previous = seen.get(id);
  if (previous) {
    issues.push(`Duplicate id ${id} is used by ${previous} and ${label}`);
    return;
  }
  seen.set(id, label);
}

/** IDs must be unique, and every reference must point at an entity of the expected kind. */
export function venueReferenceIssues(document: VenueDocument): string[] {
  const issues: string[] = [];
  const seen = new Map<string, string>();
  claimId(seen, issues, document.project.id, "project");
  claimId(seen, issues, document.venue.id, "venue");

  const assetIds = new Set<string>();
  for (const asset of document.assets) {
    claimId(seen, issues, asset.id, `asset ${asset.name}`);
    assetIds.add(asset.id);
  }

  const floorIds = new Set<string>();
  for (const floor of document.venue.floors) {
    claimId(seen, issues, floor.id, `floor ${floor.name}`);
    floorIds.add(floor.id);

    const wallIds = new Set<string>();
    for (const wall of floor.walls) {
      claimId(seen, issues, wall.id, `wall ${wall.id}`);
      wallIds.add(wall.id);
      for (const opening of wall.openings ?? []) {
        claimId(seen, issues, opening.id, `opening ${opening.id}`);
      }
    }
    for (const room of floor.rooms) {
      claimId(seen, issues, room.id, `room ${room.name}`);
      for (const wallId of room.wallIds ?? []) {
        if (!wallIds.has(wallId)) {
          issues.push(`Room ${room.id} references missing wall ${wallId}`);
        }
      }
    }
    for (const object of floor.objects) {
      claimId(seen, issues, object.id, `object ${object.name}`);
      if (object.assetId && !assetIds.has(object.assetId)) {
        issues.push(`Object ${object.id} references missing asset ${object.assetId}`);
      }
    }
    for (const zone of floor.zones) {
      claimId(seen, issues, zone.id, `zone ${zone.name}`);
    }
  }

  for (const spawn of document.venue.spawnPoints) {
    claimId(seen, issues, spawn.id, `spawn ${spawn.name}`);
    if (!floorIds.has(spawn.floorId)) {
      issues.push(`Spawn point ${spawn.id} references missing floor ${spawn.floorId}`);
    }
  }

  const navigation = document.venue.navigation;
  const waypointIds = new Set<string>();
  for (const area of navigation?.walkableAreas ?? []) {
    claimId(seen, issues, area.id, `walkable area ${area.id}`);
    if (!floorIds.has(area.floorId)) {
      issues.push(`Walkable area ${area.id} references missing floor ${area.floorId}`);
    }
  }
  for (const waypoint of navigation?.waypoints ?? []) {
    claimId(seen, issues, waypoint.id, `waypoint ${waypoint.id}`);
    waypointIds.add(waypoint.id);
    if (!floorIds.has(waypoint.floorId)) {
      issues.push(`Waypoint ${waypoint.id} references missing floor ${waypoint.floorId}`);
    }
  }
  for (const waypoint of navigation?.waypoints ?? []) {
    for (const link of waypoint.links) {
      if (!waypointIds.has(link)) {
        issues.push(`Waypoint ${waypoint.id} links to missing waypoint ${link}`);
      }
    }
  }

  return issues;
}
