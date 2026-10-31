<script setup lang="ts">
import {
  mountVenueView,
  type CameraMode,
  type GizmoMode,
  type ObjectPose,
  type VenueView,
} from "@openvenue/renderer-3d";
import type { VenueDocument } from "@openvenue/scene-schema";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = defineProps<{
  document: VenueDocument;
  cameraMode: CameraMode;
  gizmoMode: GizmoMode;
  selectedId: string | null;
}>();

const emit = defineEmits<{
  select: [id: string | null];
  transform: [id: string, mode: GizmoMode, pose: ObjectPose];
}>();

const canvas = ref<HTMLCanvasElement | null>(null);
let view: VenueView | null = null;
let observer: ResizeObserver | null = null;

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
  view = mountVenueView(element);
  view.setHandlers({
    onSelect: (id) => emit("select", id),
    onTransform: (id, mode, pose) => emit("transform", id, mode, pose),
  });
  view.setDocument(props.document);
  view.setCameraMode(props.cameraMode);
  view.setGizmoMode(props.gizmoMode);
  view.setSelected(props.selectedId);
  const parent = element.parentElement;
  if (parent && typeof ResizeObserver !== "undefined") {
    observer = new ResizeObserver(() => fit());
    observer.observe(parent);
  }
  fit();
});

watch(
  () => props.document,
  (document) => view?.setDocument(document),
  { deep: true },
);

watch(
  () => props.cameraMode,
  (mode) => view?.setCameraMode(mode),
);

watch(
  () => props.gizmoMode,
  (mode) => view?.setGizmoMode(mode),
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

defineExpose({ fit: fitView, reset: resetView });

onBeforeUnmount(() => {
  observer?.disconnect();
  view?.dispose();
  view = null;
});
</script>

<template>
  <div class="h-full min-h-0 w-full bg-zinc-950">
    <canvas ref="canvas" data-testid="venue-stage" class="h-full w-full" />
  </div>
</template>
