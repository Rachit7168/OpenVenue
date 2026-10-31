<script setup lang="ts">
import { mountVenueView, type VenueView } from "@openvenue/renderer-3d";
import type { VenueDocument } from "@openvenue/scene-schema";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = defineProps<{
  document: VenueDocument;
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
  view.setDocument(props.document);
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
