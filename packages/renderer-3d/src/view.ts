import type { VenueDocument } from "@openvenue/scene-schema";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { applyOrthoFrustum, frameVenue, type CameraMode } from "./camera.js";
import { buildVenueGroup } from "./scene.js";

export type { CameraMode };

export interface VenueView {
  setDocument(document: VenueDocument): void;
  setCameraMode(mode: CameraMode): void;
  fit(): void;
  reset(): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }
    child.geometry.dispose();
    if (child.userData.ownMaterial === true && child.material instanceof THREE.Material) {
      child.material.dispose();
    }
  });
}

/** WebGL loop owned by this module, not by the UI framework. */
export function mountVenueView(canvas: HTMLCanvasElement): VenueView {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#09090b");
  scene.add(new THREE.AmbientLight("#ffffff", 0.7));
  const sun = new THREE.DirectionalLight("#fff7ed", 1.15);
  sun.position.set(14, 22, 8);
  scene.add(sun);
  const perspective = new THREE.PerspectiveCamera(45, 1, 0.05, 500);
  perspective.position.set(16, 12, 18);
  const orthographic = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.05, 500);
  const controls = new OrbitControls(perspective, canvas);
  controls.enableDamping = true;
  controls.target.set(0, 0, 0);

  let venue: THREE.Group | null = null;
  let framedVenueId: string | null = null;
  let mode: CameraMode = "orbit";
  let active: THREE.Camera = perspective;
  let orthoHalf = 4;
  let viewWidth = 1;
  let viewHeight = 1;
  let stopped = false;
  let frameId = 0;

  const aspect = () => (viewHeight < 2 ? 1 : viewWidth / viewHeight);

  const aim = (resetDirection: boolean) => {
    if (!venue) {
      return;
    }
    const framed = frameVenue({
      mode,
      box: new THREE.Box3().setFromObject(venue),
      aspect: aspect(),
      perspective,
      orthographic,
      resetDirection,
    });
    if (!framed) {
      return;
    }
    controls.target.copy(framed.target);
    orthoHalf = framed.orthoHalf;
    active = mode === "orbit" ? perspective : orthographic;
    controls.object = active;
    controls.update();
  };

  const tick = () => {
    if (stopped) {
      return;
    }
    frameId = requestAnimationFrame(tick);
    controls.update();
    renderer.render(scene, active);
  };
  tick();

  return {
    setDocument(document) {
      if (venue) {
        scene.remove(venue);
        disposeObject(venue);
      }
      venue = buildVenueGroup(document);
      scene.add(venue);
      const replace = framedVenueId !== document.venue.id;
      if (!replace) {
        return;
      }
      aim(true);
      if (!new THREE.Box3().setFromObject(venue).isEmpty()) {
        framedVenueId = document.venue.id;
      }
    },
    setCameraMode(next) {
      if (next === mode) {
        return;
      }
      mode = next;
      aim(true);
    },
    fit() {
      aim(false);
    },
    reset() {
      aim(true);
    },
    resize(width, height) {
      if (width < 2 || height < 2) {
        return;
      }
      viewWidth = width;
      viewHeight = height;
      perspective.aspect = width / height;
      perspective.updateProjectionMatrix();
      applyOrthoFrustum(orthographic, orthoHalf, width / height);
      renderer.setSize(width, height, false);
    },
    dispose() {
      stopped = true;
      cancelAnimationFrame(frameId);
      controls.dispose();
      if (venue) {
        disposeObject(venue);
      }
      renderer.dispose();
    },
  };
}
