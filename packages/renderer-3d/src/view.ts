import type { VenueDocument } from "@openvenue/scene-schema";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { buildVenueGroup } from "./scene.js";

export interface VenueView {
  setDocument(document: VenueDocument): void;
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
  const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 500);
  camera.position.set(16, 12, 18);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.target.set(0, 0, 0);

  let venue: THREE.Group | null = null;
  let framedVenueId: string | null = null;
  let stopped = false;
  let frameId = 0;

  const tick = () => {
    if (stopped) {
      return;
    }
    frameId = requestAnimationFrame(tick);
    controls.update();
    renderer.render(scene, camera);
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
      if (framedVenueId === document.venue.id) {
        return;
      }
      const box = new THREE.Box3().setFromObject(venue);
      if (box.isEmpty()) {
        return;
      }
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const radius = Math.max(size.x, size.y, size.z, 4);
      controls.target.copy(center);
      camera.position.set(center.x + radius * 0.9, center.y + radius * 0.75, center.z + radius);
      camera.lookAt(center);
      framedVenueId = document.venue.id;
    },
    resize(width, height) {
      if (width < 2 || height < 2) {
        return;
      }
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
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
