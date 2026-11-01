<script setup lang="ts">
import {
  mountVenueView,
  type CameraMode,
  type GizmoMode,
  type ObjectPose,
  type QualityMode,
  type VenueView,
} from "@openvenue/renderer-3d";
import type { SceneSource } from "@openvenue/scene-engine";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = defineProps<{
  scene: SceneSource;
  cameraMode: CameraMode;
  eyeHeight: number;
  gizmoMode: GizmoMode;
  qualityMode: QualityMode;
  selectedId: string | null;
}>();

const emit = defineEmits<{
  select: [id: string | null];
  transform: [id: string, mode: GizmoMode, pose: ObjectPose];
  place: [assetId: string, point: { x: number; z: number }];
  exitWalk: [];
}>();

const canvas = ref<HTMLCanvasElement | null>(null);
let view: VenueView | null = null;
let observer: ResizeObserver | null = null;
let unsubscribe: (() => void) | null = null;

function fit() {
  const parent = canvas.value?.parentElement;
  if (!parent) {
    return;
  }
  view?.resize(parent.clientWidth, parent.clientHeight);
}

onMounted(() => {
  const element = canvas.value;
  if (!element) {
    return;
  }
  try {
    view = mountVenueView(element);
  } catch {
    return;
  }
  view.setHandlers({
    onSelect: (id) => emit("select", id),
    onTransform: (id, mode, pose) => emit("transform", id, mode, pose),
    onExitWalk: () => emit("exitWalk"),
  });
  view.setDocument(props.scene.getDocument());
  unsubscribe = props.scene.subscribe((change) => {
    if (change.kind === "document") {
      view?.applyChange(change.document, change.commandType);
    }
  });
  view.setCameraMode(props.cameraMode);
  view.setEyeHeight(props.eyeHeight);
  view.setGizmoMode(props.gizmoMode);
  view.setQuality(props.qualityMode);
  view.setSelected(props.selectedId);
  const parent = element.parentElement;
  if (parent && typeof ResizeObserver !== "undefined") {
    observer = new ResizeObserver(() => fit());
    observer.observe(parent);
  }
  fit();
});

watch(
  () => props.cameraMode,
  (mode) => view?.setCameraMode(mode),
);

watch(
  () => props.eyeHeight,
  (height) => view?.setEyeHeight(height),
);

watch(
  () => props.gizmoMode,
  (mode) => view?.setGizmoMode(mode),
);

watch(
  () => props.qualityMode,
  (mode) => view?.setQuality(mode),
);

watch(
  () => props.selectedId,
  (id) => view?.setSelected(id),
);

function fitView() {
  view?.fit();
}

function resetView() {
  view?.reset();
}

function onAssetDrop(event: DragEvent) {
  event.preventDefault();
  const assetId = event.dataTransfer?.getData("text/plain") ?? "";
  const point = view?.floorPoint(event.clientX, event.clientY);
  if (!assetId || !point) {
    return;
  }
  emit("place", assetId, point);
}

defineExpose({ fit: fitView, reset: resetView });

onBeforeUnmount(() => {
  unsubscribe?.();
  observer?.disconnect();
  view?.dispose();
  view = null;
});
</script>

<template>
  <div class="h-full min-h-0 w-full bg-zinc-950" @dragover.prevent @drop="onAssetDrop">
    <canvas ref="canvas" data-testid="venue-stage" class="h-full w-full" />
  </div>
</template>
