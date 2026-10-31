<script setup lang="ts">
import {
  fitViewport,
  gridLines,
  panViewport,
  pointsToPath,
  screenToWorld,
  worldToScreen,
  zoomViewport,
  type PlanPoint,
  type Viewport,
} from "@openvenue/renderer-2d";
import type { VenueDocument } from "@openvenue/scene-schema";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { planScene } from "../plan/model";

const props = withDefaults(
  defineProps<{
    document: VenueDocument;
    interactive?: boolean;
    tool?: "pan" | "select" | "wall" | "rect" | "polygon" | "zone" | "door" | "table" | "spawn";
    draft?: PlanPoint[];
    selectedIds?: string[];
  }>(),
  {
    interactive: true,
    tool: "select",
    draft: () => [],
    selectedIds: () => [],
  },
);

const emit = defineEmits<{
  down: [point: PlanPoint];
  move: [point: PlanPoint];
  up: [point: PlanPoint];
}>();

const root = ref<SVGSVGElement | null>(null);
const viewport = ref<Viewport>({ scale: 40, originX: 0, originY: 0 });
const size = ref({ width: 1, height: 1 });
const fitted = ref(false);
const cursor = ref<PlanPoint | null>(null);
const dragging = ref(false);
let last = { x: 0, y: 0 };
let observer: ResizeObserver | null = null;

const scene = computed(() => planScene(props.document));
const grid = computed(() => gridLines(viewport.value, size.value.width, size.value.height, 0.5));

const zoomLabel = computed(() => `${Math.round(viewport.value.scale)} px/m`);
const cursorLabel = computed(() => {
  if (!cursor.value) {
    return "Move over the plan";
  }
  return `x ${cursor.value.x.toFixed(2)} m    z ${cursor.value.z.toFixed(2)} m`;
});

function path(points: readonly PlanPoint[]): string {
  return points.length > 0 ? `${pointsToPath(viewport.value, points)} Z` : "";
}

function labelAt(points: readonly PlanPoint[]): PlanPoint {
  if (points.length === 0) {
    return { x: 0, z: 0 };
  }
  const sum = points.reduce((total, point) => ({ x: total.x + point.x, z: total.z + point.z }), {
    x: 0,
    z: 0,
  });
  return { x: sum.x / points.length, z: sum.z / points.length };
}

function screenOf(point: PlanPoint) {
  return worldToScreen(viewport.value, point);
}

function chosen(id: string): boolean {
  return props.selectedIds.includes(id);
}

const draftPoints = computed(() =>
  props.draft
    .map((point) => {
      const screen = screenOf(point);
      return `${screen.x},${screen.y}`;
    })
    .join(" "),
);

function fit() {
  viewport.value = fitViewport(scene.value.points, size.value.width, size.value.height, 28);
}

function measure() {
  const element = root.value;
  if (!element || element.clientWidth < 2 || element.clientHeight < 2) {
    return;
  }
  size.value = { width: element.clientWidth, height: element.clientHeight };
  if (!fitted.value) {
    fitted.value = true;
    fit();
  }
}

function localPoint(event: PointerEvent | WheelEvent): { x: number; y: number } {
  const bounds = root.value?.getBoundingClientRect();
  if (!bounds) {
    return { x: 0, y: 0 };
  }
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
}

function onPointerDown(event: PointerEvent) {
  if (!props.interactive || (event.button !== 0 && event.button !== 1)) {
    return;
  }
  const world = screenToWorld(viewport.value, localPoint(event));
  cursor.value = world;
  if (event.button === 1 || props.tool === "pan") {
    dragging.value = true;
    last = { x: event.clientX, y: event.clientY };
    root.value?.setPointerCapture(event.pointerId);
    return;
  }
  emit("down", world);
}

function onPointerMove(event: PointerEvent) {
  if (!props.interactive) {
    return;
  }
  cursor.value = screenToWorld(viewport.value, localPoint(event));
  emit("move", cursor.value);
  if (!dragging.value) {
    return;
  }
  viewport.value = panViewport(viewport.value, event.clientX - last.x, event.clientY - last.y);
  last = { x: event.clientX, y: event.clientY };
}

function onPointerUp(event: PointerEvent) {
  const wasPanning = dragging.value;
  dragging.value = false;
  if (!wasPanning && props.interactive && event.button === 0 && cursor.value) {
    emit("up", cursor.value);
  }
}

function onWheel(event: WheelEvent) {
  if (!props.interactive) {
    return;
  }
  const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
  viewport.value = zoomViewport(viewport.value, localPoint(event), factor);
}

onMounted(() => {
  measure();
  if (root.value && typeof ResizeObserver !== "undefined") {
    observer = new ResizeObserver(() => measure());
    observer.observe(root.value);
  }
});

onBeforeUnmount(() => observer?.disconnect());

watch(
  () => props.document.project.id,
  () => {
    fitted.value = false;
    measure();
  },
);
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <svg
      ref="root"
      data-testid="floor-plan"
      class="min-h-0 w-full flex-1 touch-none bg-zinc-950"
      :class="!interactive ? '' : tool === 'pan' ? 'cursor-grab' : 'cursor-crosshair'"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointerleave="onPointerUp"
      @wheel.prevent="onWheel"
    >
      <line
        v-for="(line, index) in grid.lines"
        :key="`grid-${index}`"
        :x1="line.x1"
        :y1="line.y1"
        :x2="line.x2"
        :y2="line.y2"
        :stroke="line.major ? '#3f3f46' : '#27272a'"
        stroke-width="1"
      />
      <path
        v-for="room in scene.rooms"
        :key="room.id"
        :d="path(room.points)"
        fill="#115e59"
        fill-opacity="0.55"
        :stroke="chosen(room.id) ? '#22d3ee' : '#5eead4'"
        stroke-width="1.5"
      />
      <path
        v-for="zone in scene.zones"
        :key="zone.id"
        :d="path(zone.points)"
        fill="#6d28d9"
        fill-opacity="0.35"
        :stroke="chosen(zone.id) ? '#22d3ee' : '#c4b5fd'"
        stroke-width="1.5"
        stroke-dasharray="4 3"
      />
      <line
        v-for="wall in scene.walls"
        :key="wall.id"
        :x1="screenOf(wall.start).x"
        :y1="screenOf(wall.start).y"
        :x2="screenOf(wall.end).x"
        :y2="screenOf(wall.end).y"
        :stroke="chosen(wall.id) ? '#22d3ee' : '#e4e4e7'"
        stroke-linecap="square"
        :stroke-width="Math.max(2, wall.thickness * viewport.scale)"
      />
      <line
        v-for="opening in scene.openings"
        :key="opening.id"
        :x1="screenOf(opening.start).x"
        :y1="screenOf(opening.start).y"
        :x2="screenOf(opening.end).x"
        :y2="screenOf(opening.end).y"
        stroke="#09090b"
        stroke-linecap="butt"
        :stroke-width="Math.max(3, viewport.scale * 0.24)"
      />
      <path
        v-for="object in scene.objects"
        :key="object.id"
        :d="path(object.points)"
        fill="#d97706"
        :stroke="chosen(object.id) ? '#22d3ee' : '#fde68a'"
        stroke-width="1"
      />
      <polyline
        v-if="draftPoints"
        :points="draftPoints"
        fill="none"
        stroke="#fbbf24"
        stroke-width="2"
      />
      <g v-for="spawn in scene.spawns" :key="spawn.id">
        <circle
          :cx="screenOf(spawn.point).x"
          :cy="screenOf(spawn.point).y"
          r="6"
          :fill="spawn.role === 'exit' ? '#fb7185' : '#38bdf8'"
          :stroke="chosen(spawn.id) ? '#22d3ee' : '#fafafa'"
          stroke-width="1.5"
        />
        <text
          :x="screenOf(spawn.point).x + 8"
          :y="screenOf(spawn.point).y - 8"
          fill="#e4e4e7"
          font-size="11"
        >
          {{ spawn.name }}
        </text>
      </g>
      <text
        v-for="room in scene.rooms"
        :key="`${room.id}-label`"
        :x="screenOf(labelAt(room.points)).x"
        :y="screenOf(labelAt(room.points)).y"
        fill="#ccfbf1"
        font-size="12"
        text-anchor="middle"
      >
        {{ room.name }}
      </text>
    </svg>
    <p
      v-if="interactive"
      data-testid="plan-status"
      class="flex justify-between gap-3 border-t border-zinc-800 bg-zinc-900 px-3 py-1.5 font-mono text-xs text-zinc-300"
    >
      <span>{{ cursorLabel }}</span>
      <span>grid {{ grid.step }} m · {{ zoomLabel }} · metres</span>
    </p>
  </div>
</template>
