import type { VenueDocument } from "@openvenue/scene-schema";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { applyOrthoFrustum, frameVenue, type CameraMode } from "./camera.js";
import {
  entityIdFromHit,
  entityIdOf,
  floorIdOf,
  poseFromMesh,
  type GizmoMode,
  type ObjectBase,
  type ObjectPose,
} from "./pick.js";
import { qualityOptions, type QualityMode } from "./quality.js";
import { onModelsChanged } from "./glb.js";
import { buildVenueGroup, indexChairs, type BuildVenueOptions, type ChairSlot } from "./scene.js";
import { patchVenueGroup } from "./sync.js";
import {
  applyLook,
  collisionSegments,
  DEFAULT_EYE_HEIGHT,
  spawnWalker,
  stepWalker,
  clampEyeHeight,
  type WalkWall,
  type Walker,
} from "./walk.js";

export type { CameraMode, GizmoMode, ObjectPose, QualityMode };

export interface VenueView {
  setDocument(document: VenueDocument): void;
  applyChange(document: VenueDocument, commandType: string | null): void;
  setCameraMode(mode: CameraMode): void;
  setMapFloor(floorId: string | null): void;
  setEyeHeight(height: number): void;
  setQuality(mode: QualityMode): void;
  setSelected(id: string | null): void;
  setGizmoMode(mode: GizmoMode): void;
  setHandlers(handlers: {
    onSelect: (id: string | null) => void;
    onTransform: (id: string, mode: GizmoMode, pose: ObjectPose) => void;
    onExitWalk?: () => void;
    onFloor?: (floorId: string) => void;
  }): void;
  fit(): void;
  reset(): void;
  floorPoint(clientX: number, clientY: number): { x: number; z: number } | null;
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
    if (!(child instanceof THREE.Mesh) || child.userData.sharedGeometry === true) {
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
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const floorHit = new THREE.Vector3();

  let venue: THREE.Group | null = null;
  let framedVenueId: string | null = null;
  let mode: CameraMode = "orbit";
  let gizmoMode: GizmoMode = "translate";
  let selectedId: string | null = null;
  let onSelect: (id: string | null) => void = () => undefined;
  let onTransform: (id: string, mode: GizmoMode, pose: ObjectPose) => void = () => undefined;
  let onExitWalk: () => void = () => undefined;
  let onFloor: (floorId: string) => void = () => undefined;
  let mapFloorId: string | null = null;
  let walker: Walker = { x: 0, z: 0, yaw: 0, pitch: 0 };
  let eyeHeight = DEFAULT_EYE_HEIGHT;
  const pressed = new Set<string>();
  let lastTick = performance.now();
  let ignoreClick = false;
  let pointerDown: { x: number; y: number } | null = null;
  let active: THREE.Camera = perspective;
  let orthoHalf = 4;
  let viewWidth = 1;
  let viewHeight = 1;
  let chairHandle: THREE.Object3D | null = null;
  let chairSlot: ChairSlot | null = null;
  let lastDocument: VenueDocument | null = null;
  let stopped = false;
  let frameId = 0;

  const aspect = () => (viewHeight < 2 ? 1 : viewWidth / viewHeight);

  const aim = (resetDirection: boolean) => {
    if (!venue) {
      return;
    }
    const framed = frameVenue({
      mode: mode === "orbit" ? "orbit" : "isometric",
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
    if (mode === "walk" || mode === "map") {
      gizmo.detach();
      return;
    }
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

  const sceneOptions = (): BuildVenueOptions => ({
    style: mode === "map" ? "map" : "hall",
    floorId: mode === "map" ? mapFloorId : null,
  });

  const pickHit = (clientX: number, clientY: number) => {
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
    return raycaster.intersectObject(venue, true)[0] ?? null;
  };

  const pickId = (clientX: number, clientY: number): string | null => {
    const hit = pickHit(clientX, clientY);
    return hit ? entityIdFromHit(hit.object, hit.instanceId) : null;
  };

  const tintMapSelection = () => {
    if (!venue) {
      return;
    }
    venue.traverse((child) => {
      const color = child.userData.mapColor;
      if (typeof color !== "string" || !(child instanceof THREE.Mesh)) {
        return;
      }
      const material = child.material;
      if (!(material instanceof THREE.MeshStandardMaterial)) {
        return;
      }
      const chosen = mode === "map" && child.userData.entityId === selectedId;
      material.color.set(chosen ? "#5eead4" : color);
    });
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
    if (ignoreClick || mode === "walk") {
      ignoreClick = false;
      return;
    }
    if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) {
      return;
    }
    if (mode === "map" && mapFloorId === null) {
      const hit = pickHit(event.clientX, event.clientY);
      const floorId = hit ? floorIdOf(hit.object) : null;
      if (floorId) {
        onFloor(floorId);
      }
      onSelect(hit ? entityIdFromHit(hit.object, hit.instanceId) : null);
      return;
    }
    onSelect(pickId(event.clientX, event.clientY));
  };

  const onDoubleClick = () => {
    if (mode !== "map") {
      return;
    }
    orthographic.zoom = Math.min(orthographic.zoom * 1.4, 12);
    orthographic.updateProjectionMatrix();
  };

  gizmo.addEventListener("dragging-changed", (event) => {
    controls.enabled = event.value !== true && mode !== "walk";
  });
  gizmo.addEventListener("objectChange", followChairHandle);
  gizmo.addEventListener("mouseUp", () => {
    ignoreClick = true;
    commitGizmo();
  });
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("dblclick", onDoubleClick);

  const currentWalls = (): WalkWall[] => {
    const floor = lastDocument?.venue.floors[0];
    if (!floor) {
      return [];
    }
    return collisionSegments(
      floor.walls.map((wall) => ({
        startX: wall.start.x,
        startZ: wall.start.z,
        endX: wall.end.x,
        endZ: wall.end.z,
        thickness: wall.thickness,
        openings: wall.openings?.map((opening) => ({
          kind: opening.kind,
          offset: opening.offset,
          width: opening.width,
        })),
      })),
    );
  };

  const applyWalker = () => {
    perspective.position.set(walker.x, eyeHeight, walker.z);
    perspective.rotation.order = "YXZ";
    perspective.rotation.set(walker.pitch, walker.yaw, 0);
    active = perspective;
  };

  const beginWalk = () => {
    const spawn =
      lastDocument?.venue.spawnPoints.find((point) => point.role === "visitor") ??
      lastDocument?.venue.spawnPoints[0];
    const walls = currentWalls();
    walker = spawn
      ? spawnWalker(spawn.position, spawn.rotationY, walls)
      : spawnWalker({ x: 0, z: 0 }, 0, walls);
    controls.enabled = false;
    gizmo.detach();
    gizmo.enabled = false;
    applyWalker();
  };

  const tick = () => {
    if (stopped) {
      return;
    }
    frameId = requestAnimationFrame(tick);
    const now = performance.now();
    const dt = (now - lastTick) / 1000;
    lastTick = now;
    if (mode === "walk") {
      const forward = (pressed.has("KeyW") ? 1 : 0) - (pressed.has("KeyS") ? 1 : 0);
      const strafe = (pressed.has("KeyD") ? 1 : 0) - (pressed.has("KeyA") ? 1 : 0);
      walker = stepWalker(walker, { forward, strafe }, currentWalls(), dt);
      applyWalker();
    } else {
      controls.update();
    }
    renderer.render(scene, active);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (mode !== "walk" || canvas.offsetParent === null) {
      return;
    }
    if (event.code === "Escape") {
      onExitWalk();
      return;
    }
    if (
      event.code === "KeyW" ||
      event.code === "KeyA" ||
      event.code === "KeyS" ||
      event.code === "KeyD"
    ) {
      pressed.add(event.code);
      event.preventDefault();
    }
  };

  const onKeyUp = (event: KeyboardEvent) => {
    pressed.delete(event.code);
  };

  const onMouseMove = (event: MouseEvent) => {
    if (mode !== "walk" || document.pointerLockElement !== canvas) {
      return;
    }
    const look = applyLook(walker.yaw, walker.pitch, event.movementX, event.movementY);
    walker = { ...walker, yaw: look.yaw, pitch: look.pitch };
  };

  const onCanvasClick = () => {
    if (mode !== "walk" || document.pointerLockElement === canvas) {
      return;
    }
    void canvas.requestPointerLock();
  };

  canvas.addEventListener("click", onCanvasClick);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("mousemove", onMouseMove);

  const applyQuality = (quality: QualityMode) => {
    const options = qualityOptions(quality);
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
  const stopModels = onModelsChanged(() => {
    if (lastDocument) {
      replaceDocument(lastDocument);
    }
  });

  const replaceDocument = (document: VenueDocument, aimCamera = false) => {
    lastDocument = document;
    chairSlot = null;
    gizmo.detach();
    if (venue) {
      scene.remove(venue);
      disposeObject(venue);
    }
    venue = buildVenueGroup(document, sceneOptions());
    scene.add(venue);
    scene.background = new THREE.Color(mode === "map" ? "#e8eaf6" : "#09090b");
    controls.zoomToCursor = mode === "map";
    tintMapSelection();
    attachSelected();
    const replace = framedVenueId !== document.venue.id;
    if (!replace && !aimCamera) {
      return;
    }
    if (mode === "walk") {
      beginWalk();
    } else {
      aim(true);
    }
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
      const rebuild = mode === "map" || next === "map";
      mode = next;
      pressed.clear();
      if (document.pointerLockElement === canvas) {
        document.exitPointerLock();
      }
      if (rebuild && lastDocument) {
        replaceDocument(lastDocument, true);
      }
      if (next === "walk") {
        beginWalk();
        return;
      }
      gizmo.enabled = next !== "map";
      controls.enabled = true;
      perspective.rotation.set(0, 0, 0);
      if (!rebuild) {
        aim(true);
      }
    },
    setMapFloor(floorId) {
      if (floorId === mapFloorId) {
        return;
      }
      mapFloorId = floorId;
      if (mode === "map" && lastDocument) {
        replaceDocument(lastDocument, true);
      }
    },
    setEyeHeight(height) {
      eyeHeight = clampEyeHeight(height);
      if (mode === "walk") {
        applyWalker();
      }
    },
    setQuality(next) {
      applyQuality(next);
    },
    fit() {
      if (mode !== "walk") {
        aim(false);
      }
    },
    reset() {
      if (mode === "walk") {
        beginWalk();
        return;
      }
      aim(true);
    },
    floorPoint(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) {
        return null;
      }
      pointer.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, active);
      const hit = raycaster.ray.intersectPlane(floorPlane, floorHit);
      return hit ? { x: hit.x, z: hit.z } : null;
    },
    setSelected(id) {
      selectedId = id;
      tintMapSelection();
      attachSelected();
    },
    setGizmoMode(next) {
      gizmoMode = next;
      gizmo.setMode(next);
    },
    setHandlers(handlers) {
      onSelect = handlers.onSelect;
      onTransform = handlers.onTransform;
      onExitWalk = handlers.onExitWalk ?? (() => undefined);
      onFloor = handlers.onFloor ?? (() => undefined);
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
      stopModels();
      cancelAnimationFrame(frameId);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("dblclick", onDoubleClick);
      canvas.removeEventListener("click", onCanvasClick);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      if (document.pointerLockElement === canvas) {
        document.exitPointerLock();
      }
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
