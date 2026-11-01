import type { VenueDocument } from "@openvenue/scene-schema";
import * as THREE from "three";
import { indexChairs, placeModel, placeObjectMesh, writeChairMatrix } from "./scene.js";

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
  const models = new Map<string, THREE.Object3D>();
  group.traverse((child) => {
    if (child.userData.model === true && typeof child.userData.entityId === "string") {
      models.set(child.userData.entityId, child);
      return;
    }
    if (
      child instanceof THREE.Mesh &&
      !(child instanceof THREE.InstancedMesh) &&
      typeof child.userData.entityId === "string"
    ) {
      meshes.set(child.userData.entityId, child);
    }
  });
  const chairs = indexChairs(group);
  const visible = floor.objects.filter((object) => shown(object));
  if (
    visible.some(
      (object) => !meshes.has(object.id) && !chairs.has(object.id) && !models.has(object.id),
    )
  ) {
    return false;
  }
  const touched = new Set<THREE.InstancedMesh>();
  for (const object of visible) {
    const model = models.get(object.id);
    if (model) {
      placeModel(model, object);
      continue;
    }
    const mesh = meshes.get(object.id);
    if (mesh) {
      placeObjectMesh(mesh, object);
    }
    const chair = chairs.get(object.id);
    if (chair) {
      if (!writeChairMatrix(chair.mesh, chair.index, object)) {
        return false;
      }
      touched.add(chair.mesh);
    }
  }
  for (const mesh of touched) {
    mesh.computeBoundingSphere();
  }
  return true;
}
