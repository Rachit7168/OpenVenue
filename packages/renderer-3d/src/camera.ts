import * as THREE from "three";

export type CameraMode = "orbit" | "isometric";

const ISO_DIRECTION = new THREE.Vector3(1, 1, 1).normalize();

export interface FrameResult {
  target: THREE.Vector3;
  orthoHalf: number;
}

function safeAspect(aspect: number): number {
  return Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
}

/** Keep an orthographic frustum fitted to `half` metres at the current aspect. */
export function applyOrthoFrustum(
  camera: THREE.OrthographicCamera,
  half: number,
  aspect: number,
): void {
  const safe = safeAspect(aspect);
  camera.left = -half * safe;
  camera.right = half * safe;
  camera.top = half;
  camera.bottom = -half;
  camera.updateProjectionMatrix();
}

/**
 * Point the active camera at a venue.
 * Orbit uses a perspective camera. Isometric uses an orthographic camera
 * looking along +X +Y +Z when the direction is reset.
 */
export function frameVenue(options: {
  mode: CameraMode;
  box: THREE.Box3;
  aspect: number;
  perspective: THREE.PerspectiveCamera;
  orthographic: THREE.OrthographicCamera;
  resetDirection: boolean;
}): FrameResult | null {
  if (options.box.isEmpty()) {
    return null;
  }
  const target = options.box.getCenter(new THREE.Vector3());
  const size = options.box.getSize(new THREE.Vector3());
  const extent = Math.max(size.x, size.y, size.z, 4);
  const sphere = options.box.getBoundingSphere(new THREE.Sphere());
  const orthoHalf = Math.max(sphere.radius, 2) * 1.2;
  const camera = options.mode === "orbit" ? options.perspective : options.orthographic;
  const distance = options.mode === "orbit" ? extent * 1.6 : extent * 2.2;
  const offset = options.resetDirection
    ? options.mode === "orbit"
      ? new THREE.Vector3(extent * 0.9, extent * 0.75, extent)
      : ISO_DIRECTION.clone().multiplyScalar(distance)
    : camera.position.clone().sub(target);
  if (offset.lengthSq() < 1e-6) {
    offset.copy(ISO_DIRECTION);
  }
  if (!options.resetDirection) {
    offset.setLength(distance);
  }
  camera.position.copy(target).add(offset);
  camera.up.set(0, 1, 0);
  camera.lookAt(target);
  const aspect = safeAspect(options.aspect);
  options.perspective.aspect = aspect;
  options.perspective.updateProjectionMatrix();
  options.orthographic.zoom = 1;
  applyOrthoFrustum(options.orthographic, orthoHalf, aspect);
  return { target, orthoHalf };
}
