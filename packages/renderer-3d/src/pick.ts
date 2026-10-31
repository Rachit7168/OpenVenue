import type { Object3D } from "three";

export type GizmoMode = "translate" | "rotate" | "scale";

export interface ObjectBase {
  width: number;
  height: number;
  depth: number;
}

export interface ObjectPose {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  dimensions: { width: number; height: number; depth: number };
}

const MIN_SIZE = 0.3;

/** Furniture id stored on a mesh, walking up to the venue group. */
export function entityIdOf(object: Object3D): string | null {
  let current: Object3D | null = object;
  while (current) {
    const id = current.userData.entityId;
    if (typeof id === "string" && id.length > 0) {
      return id;
    }
    current = current.parent;
  }
  return null;
}

/** Schema pose for a box whose mesh origin is its centre. */
export function poseFromMesh(mesh: Object3D, base: ObjectBase): ObjectPose {
  const width = Math.max(MIN_SIZE, base.width * Math.abs(mesh.scale.x));
  const height = Math.max(MIN_SIZE, base.height * Math.abs(mesh.scale.y));
  const depth = Math.max(MIN_SIZE, base.depth * Math.abs(mesh.scale.z));
  return {
    position: {
      x: mesh.position.x,
      y: mesh.position.y - height / 2,
      z: mesh.position.z,
    },
    rotation: {
      x: mesh.rotation.x,
      y: mesh.rotation.y,
      z: mesh.rotation.z,
    },
    dimensions: { width, height, depth },
  };
}
