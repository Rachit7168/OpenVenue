import type { VenueDocument } from "@openvenue/scene-schema";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { applyOrthoFrustum, frameVenue, type CameraMode } from "./camera.js";
import {
  entityIdFromHit,
  entityIdOf,
  poseFromMesh,
  type GizmoMode,
  type ObjectBase,
  type ObjectPose,
} from "./pick.js";
import { qualityOptions, type QualityMode } from "./quality.js";
import { buildVenueGroup, indexChairs, type ChairSlot } from "./scene.js";
import { patchVenueGroup } from "./sync.js";

export type { CameraMode, GizmoMode, ObjectPose, QualityMode };

export interface VenueView {
  setDocument(document: VenueDocument): void;
  applyChange(document: VenueDocument, commandType: string | null): void;
  setCameraMode(mode: CameraMode): void;
  setQuality(mode: QualityMode): void;
  setSelected(id: string | null): void;
  setGizmoMode(mode: GizmoMode): void;
  setHandlers(handlers: {
    onSelect: (id: string | null) => void;
    onTransform: (id: string, mode: GizmoMode, pose: ObjectPose) => void;
  }): void;
  fit(): void;
  reset(): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

function isObjectBase(value: unknown): value is ObjectBase {
  if (!value || typeof value !== "object") {
    return false;
  }
  const base = value as Partial<ObjectBase>;
  return (
    typeof base.width === "number" &&
    typeof base.height === "number" &&
    typeof base.depth === "number"
  );
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
  const ambient = new THREE.AmbientLight("#ffffff", 0.7);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight("#fff7ed", 1.2);
  sun.position.set(14, 22, 8);
  scene.add(sun);
  scene.add(sun.target);
  const fill = new THREE.DirectionalLight("#dbeafe", 0);
  fill.position.set(-12, 10, -8);
  scene.add(fill);
  const perspective = new THREE.PerspectiveCamera(45, 1, 0.05, 500);
  perspective.position.set(16, 12, 18);
  const orthographic = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.05, 500);
  const controls = new OrbitControls(perspective, canvas);
  controls.enableDamping = true;
  controls.target.set(0, 0, 0);
  const gizmo = new TransformControls(perspective, canvas);
  gizmo.setMode("translate");
  const gizmoHelper = gizmo.getHelper();
  scene.add(gizmoHelper);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  let venue: THREE.Group | null = null;
  let framedVenueId: string | null = null;
  let mode: CameraMode = "orbit";
  let gizmoMode: GizmoMode = "translate";
  let selectedId: string | null = null;
  let onSelect: (id: string | null) => void = () => undefined;
  let onTransform: (id: string, mode: GizmoMode, pose: ObjectPose) => void = () => undefined;
  let ignoreClick = false;
  let pointerDown: { x: number; y: number } | null = null;
  let active: THREE.Camera = perspective;
  let orthoHalf = 4;
  let viewWidth = 1;
  let viewHeight = 1;
  let chairHandle: THREE.Object3D | null = null;
  let chairSlot: ChairSlot | null = null;
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
    const center = new THREE.Box3().setFromObject(venue).getCenter(new THREE.Vector3());
    sun.position.set(center.x + 18, center.y + 8, center.z + 12);
    sun.target.position.copy(center);
    sun.target.updateMatrixWorld();
    fill.position.set(center.x - 12, center.y + 10, center.z - 8);
    active = mode === "orbit" ? perspective : orthographic;
    controls.object = active;
    gizmo.camera = active;
    controls.update();
  };

  const findSelected = (): THREE.Object3D | null => {
    if (!venue || !selectedId) {
      return null;
    }
    let found: THREE.Object3D | null = null;
    venue.traverse((child) => {
      if (child.userData.entityId === selectedId && child.userData.locked !== true) {
        found = child;
      }
    });
    return found;
  };

  const clearChairHandle = () => {
    chairSlot = null;
    if (!chairHandle) {
      return;
    }
    gizmo.detach();
    scene.remove(chairHandle);
    chairHandle = null;
  };

  const syncChairHandle = () => {
    const slot = venue && selectedId ? (indexChairs(venue).get(selectedId) ?? null) : null;
    if (!slot || slot.locked) {
      return false;
    }
    if (!chairHandle) {
      chairHandle = new THREE.Object3D();
      scene.add(chairHandle);
    }
    chairSlot = slot;
    const geometry = slot.mesh.geometry;
    if (geometry instanceof THREE.BoxGeometry) {
      chairHandle.userData.base = {
        width: geometry.parameters.width,
        height: geometry.parameters.height,
        depth: geometry.parameters.depth,
      };
    }
    chairHandle.userData.entityId = selectedId;
    chairHandle.userData.locked = false;
    if (!gizmo.dragging) {
      const matrix = new THREE.Matrix4();
      slot.mesh.getMatrixAt(slot.index, matrix);
      chairHandle.position.setFromMatrixPosition(matrix);
      chairHandle.quaternion.setFromRotationMatrix(matrix);
      chairHandle.rotation.setFromQuaternion(chairHandle.quaternion);
      chairHandle.scale.set(1, 1, 1);
    }
    return true;
  };

  const followChairHandle = () => {
    if (!chairHandle || !chairSlot || gizmo.object !== chairHandle) {
      return;
    }
    chairHandle.updateMatrix();
    chairSlot.mesh.setMatrixAt(chairSlot.index, chairHandle.matrix);
    chairSlot.mesh.instanceMatrix.needsUpdate = true;
    chairSlot.mesh.computeBoundingSphere();
  };

  const attachSelected = () => {
    if (syncChairHandle()) {
      if (chairHandle) {
        gizmo.attach(chairHandle);
        gizmo.setMode(gizmoMode);
      }
      return;
    }
    clearChairHandle();
    const mesh = findSelected();
    if (!mesh) {
      gizmo.detach();
      return;
    }
    gizmo.attach(mesh);
    gizmo.setMode(gizmoMode);
  };

  const commitGizmo = () => {
    const mesh = gizmo.object;
    if (!mesh || mesh.userData.locked === true) {
      return;
    }
    const id = entityIdOf(mesh);
    const base = mesh.userData.base;
    if (!id || !isObjectBase(base)) {
      return;
    }
    onTransform(id, gizmoMode, poseFromMesh(mesh, base));
  };

  const pickId = (clientX: number, clientY: number): string | null => {
    if (!venue) {
      return null;
    }
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) {
      return null;
    }
    pointer.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, active);
    const hit = raycaster.intersectObject(venue, true)[0];
    return hit ? entityIdFromHit(hit.object, hit.instanceId) : null;
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) {
      return;
    }
    pointerDown = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: PointerEvent) => {
    if (event.button !== 0) {
      return;
    }
    const start = pointerDown;
    pointerDown = null;
    if (ignoreClick) {
      ignoreClick = false;
      return;
    }
    if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) {
      return;
    }
    onSelect(pickId(event.clientX, event.clientY));
  };

  gizmo.addEventListener("dragging-changed", (event) => {
    controls.enabled = event.value !== true;
  });
  gizmo.addEventListener("objectChange", followChairHandle);
  gizmo.addEventListener("mouseUp", () => {
    ignoreClick = true;
    commitGizmo();
  });
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerup", onPointerUp);

  const tick = () => {
    if (stopped) {
      return;
    }
    frameId = requestAnimationFrame(tick);
    controls.update();
    renderer.render(scene, active);
  };

  const applyQuality = (mode: QualityMode) => {
    const options = qualityOptions(mode);
    renderer.shadowMap.enabled = options.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    sun.castShadow = options.shadows;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0002;
    sun.shadow.normalBias = 0.02;
    const span = 30;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 80;
    sun.shadow.camera.left = -span;
    sun.shadow.camera.right = span;
    sun.shadow.camera.top = span;
    sun.shadow.camera.bottom = -span;
    sun.shadow.camera.updateProjectionMatrix();
    fill.intensity = options.fillIntensity;
    ambient.intensity = options.ambientIntensity;
    renderer.shadowMap.needsUpdate = true;
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, options.pixelRatioCap));
    if (viewWidth >= 2 && viewHeight >= 2) {
      renderer.setSize(viewWidth, viewHeight, false);
    }
  };

  applyQuality("high");
  tick();

  const replaceDocument = (document: VenueDocument) => {
    chairSlot = null;
    gizmo.detach();
    if (venue) {
      scene.remove(venue);
      disposeObject(venue);
    }
    venue = buildVenueGroup(document);
    scene.add(venue);
    attachSelected();
    const replace = framedVenueId !== document.venue.id;
    if (!replace) {
      return;
    }
    aim(true);
    if (!new THREE.Box3().setFromObject(venue).isEmpty()) {
      framedVenueId = document.venue.id;
    }
  };

  return {
    setDocument: replaceDocument,
    applyChange(document, commandType) {
      if (venue && patchVenueGroup(venue, document, commandType)) {
        attachSelected();
        return;
      }
      replaceDocument(document);
    },
    setCameraMode(next) {
      if (next === mode) {
        return;
      }
      mode = next;
      aim(true);
    },
    setQuality(next) {
      applyQuality(next);
    },
    fit() {
      aim(false);
    },
    reset() {
      aim(true);
    },
    setSelected(id) {
      selectedId = id;
      attachSelected();
    },
    setGizmoMode(next) {
      gizmoMode = next;
      gizmo.setMode(next);
    },
    setHandlers(handlers) {
      onSelect = handlers.onSelect;
      onTransform = handlers.onTransform;
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
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      gizmo.detach();
      if (chairHandle) {
        scene.remove(chairHandle);
        chairHandle = null;
      }
      gizmo.dispose();
      scene.remove(gizmoHelper);
      controls.dispose();
      if (venue) {
        disposeObject(venue);
      }
      renderer.dispose();
    },
  };
}
