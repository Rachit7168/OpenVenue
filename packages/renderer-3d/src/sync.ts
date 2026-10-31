import type { VenueDocument } from "@openvenue/scene-schema";
import * as THREE from "three";
import { placeObjectMesh } from "./scene.js";

const LIVE_EDITS = new Set(["MOVE_OBJECT", "ROTATE_OBJECT", "RESIZE_OBJECT"]);

function shown(entity: object): boolean {
  return (entity as { visible?: unknown }).visible !== false;
}

/**
 * Update furniture meshes in place. Returns false when the edit adds or removes
 * geometry, so the caller rebuilds the hall.
 */
export function patchVenueGroup(
  group: THREE.Group,
  document: VenueDocument,
  commandType: string | null,
): boolean {
  if (!commandType || !LIVE_EDITS.has(commandType)) {
    return false;
  }
  const floor = document.venue.floors[0];
  if (!floor) {
    return false;
  }
  const meshes = new Map<string, THREE.Mesh>();
  group.traverse((child) => {
    if (child instanceof THREE.Mesh && typeof child.userData.entityId === "string") {
      meshes.set(child.userData.entityId, child);
    }
  });
  const visible = floor.objects.filter((object) => shown(object));
  if (visible.some((object) => !meshes.has(object.id))) {
    return false;
  }
  for (const object of visible) {
    const mesh = meshes.get(object.id);
    if (mesh) {
      placeObjectMesh(mesh, object);
    }
  }
  return true;
}
