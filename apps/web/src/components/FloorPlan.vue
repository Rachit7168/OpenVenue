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
import { tableSeats, type Seat } from "../plan/furniture";
import { planScene, type PlanFixture, type PlanOpening } from "../plan/model";

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
const floorPatternId = `floor-${Math.random().toString(36).slice(2, 8)}`;
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

function metres(value: number): number {
  return value * viewport.value.scale;
}

function fixtureTransform(object: PlanFixture): string {
  const center = screenOf(object.center);
  const degrees = (object.yaw * 180) / Math.PI;
  return `translate(${center.x} ${center.y}) rotate(${degrees})`;
}

function seatTransform(seat: Seat): string {
  const degrees = (seat.yaw * 180) / Math.PI;
  return `translate(${metres(seat.x)} ${-metres(seat.z)}) rotate(${degrees})`;
}

function labelWidth(name: string): number {
  return Math.max(28, name.length * 6.4 + 16);
}

function swingPath(opening: PlanOpening): string {
  const hinge = screenOf(opening.start);
  const latched = screenOf(opening.end);
  const dx = latched.x - hinge.x;
  const dy = latched.y - hinge.y;
  const radius = Math.hypot(dx, dy);
  if (radius < 1 || opening.kind === "opening") {
    return "";
  }
  if (opening.kind === "window") {
    return `M ${hinge.x} ${hinge.y} L ${latched.x} ${latched.y}`;
  }
  const openX = hinge.x - dy;
  const openY = hinge.y + dx;
  return `M ${latched.x} ${latched.y} A ${radius} ${radius} 0 0 0 ${openX} ${openY} M ${hinge.x} ${hinge.y} L ${openX} ${openY}`;
}

function facingEnd(point: { x: number; z: number }, rotationY: number): { x: number; y: number } {
  const center = screenOf(point);
  return {
    x: center.x + Math.sin(rotationY) * 16,
    y: center.y - Math.cos(rotationY) * 16,
  };
}

const fixtureFill: Record<string, string> = {
  stage: "#6d28d9",
  booth: "#0f766e",
  screen: "#0f172a",
  podium: "#57534e",
  sign: "#d97706",
  generic: "#a8a29e",
  custom: "#a8a29e",
};

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
  const screen = localPoint(event);
  if (dragging.value) {
    viewport.value = panViewport(viewport.value, event.clientX - last.x, event.clientY - last.y);
    last = { x: event.clientX, y: event.clientY };
  }
  cursor.value = screenToWorld(viewport.value, screen);
  emit("move", cursor.value);
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
      <defs>
        <pattern :id="floorPatternId" width="32" height="12" patternUnits="userSpaceOnUse">
          <rect width="32" height="12" fill="#166534" />
          <path d="M0 12 H32" stroke="#14532d" stroke-width="2" />
        </pattern>
      </defs>
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
        :fill="`url(#${floorPatternId})`"
        :stroke="chosen(room.id) ? '#22d3ee' : '#86efac'"
        stroke-width="1.5"
      />
      <path
        v-for="zone in scene.zones"
        :key="zone.id"
        :d="path(zone.points)"
        fill="#6d28d9"
        fill-opacity="0.28"
        :stroke="chosen(zone.id) ? '#22d3ee' : '#ddd6fe'"
        stroke-width="1.5"
        stroke-dasharray="5 4"
      />
      <g v-for="wall in scene.walls" :key="wall.id">
        <line
          :x1="screenOf(wall.start).x"
          :y1="screenOf(wall.start).y"
          :x2="screenOf(wall.end).x"
          :y2="screenOf(wall.end).y"
          stroke="#292524"
          stroke-linecap="square"
          :stroke-width="Math.max(6, wall.thickness * viewport.scale + 3)"
        />
        <line
          :x1="screenOf(wall.start).x"
          :y1="screenOf(wall.start).y"
          :x2="screenOf(wall.end).x"
          :y2="screenOf(wall.end).y"
          :stroke="chosen(wall.id) ? '#22d3ee' : '#fafaf9'"
          stroke-linecap="square"
          :stroke-width="Math.max(3, wall.thickness * viewport.scale)"
        />
      </g>
      <g v-for="opening in scene.openings" :key="opening.id">
        <line
          :x1="screenOf(opening.start).x"
          :y1="screenOf(opening.start).y"
          :x2="screenOf(opening.end).x"
          :y2="screenOf(opening.end).y"
          stroke="#166534"
          stroke-linecap="butt"
          :stroke-width="Math.max(5, viewport.scale * 0.28)"
        />
        <path
          v-if="swingPath(opening)"
          :d="swingPath(opening)"
          fill="none"
          :stroke="opening.kind === 'window' ? '#7dd3fc' : '#fcd34d'"
          stroke-width="1.5"
        />
      </g>
      <g v-for="object in scene.objects" :key="object.id" :transform="fixtureTransform(object)">
        <rect
          v-if="chosen(object.id)"
          :x="metres(-object.width / 2 - 0.08)"
          :y="metres(-object.depth / 2 - 0.08)"
          :width="metres(object.width + 0.16)"
          :height="metres(object.depth + 0.16)"
          fill="none"
          stroke="#22d3ee"
          stroke-width="2"
        />
        <template v-if="object.type === 'table'">
          <g
            v-for="(seat, index) in viewport.scale >= 10
              ? tableSeats(object.width, object.depth)
              : []"
            :key="`${object.id}-seat-${index}`"
            :transform="seatTransform(seat)"
          >
            <rect
              :x="metres(-0.18)"
              :y="metres(-0.16)"
              :width="metres(0.36)"
              :height="metres(0.32)"
              rx="2"
              fill="#e7e5e4"
              stroke="#44403c"
              stroke-width="1"
            />
            <line
              :x1="metres(-0.14)"
              :y1="metres(-0.16)"
              :x2="metres(0.14)"
              :y2="metres(-0.16)"
              stroke="#292524"
              stroke-width="2.5"
              stroke-linecap="round"
            />
          </g>
          <rect
            :x="metres(-object.width / 2)"
            :y="metres(-object.depth / 2)"
            :width="metres(object.width)"
            :height="metres(object.depth)"
            :rx="Math.min(7, metres(0.08))"
            fill="#d4b483"
            stroke="#78350f"
            stroke-width="1.25"
          />
          <rect
            :x="metres(-object.width / 2 + 0.07)"
            :y="metres(-object.depth / 2 + 0.07)"
            :width="metres(Math.max(object.width - 0.14, 0.08))"
            :height="metres(Math.max(object.depth - 0.14, 0.08))"
            rx="3"
            fill="#f3e0c0"
          />
        </template>
        <template v-else-if="object.type === 'chair'">
          <rect
            :x="metres(-object.width / 2)"
            :y="metres(-object.depth / 2)"
            :width="metres(object.width)"
            :height="metres(object.depth)"
            rx="3"
            fill="#e7e5e4"
            stroke="#44403c"
            stroke-width="1"
          />
          <line
            :x1="metres(-object.width / 2 + 0.04)"
            :y1="metres(-object.depth / 2)"
            :x2="metres(object.width / 2 - 0.04)"
            :y2="metres(-object.depth / 2)"
            stroke="#292524"
            stroke-width="3"
            stroke-linecap="round"
          />
        </template>
        <template v-else-if="object.type === 'screen'">
          <line
            x1="0"
            :y1="metres(object.depth / 2)"
            x2="0"
            :y2="metres(object.depth / 2 + 0.25)"
            stroke="#334155"
            stroke-width="3"
          />
          <rect
            :x="metres(-object.width / 2)"
            :y="metres(-object.depth / 2)"
            :width="metres(object.width)"
            :height="metres(object.depth)"
            rx="3"
            fill="#0f172a"
            stroke="#38bdf8"
            stroke-width="2"
          />
        </template>
        <rect
          v-else
          :x="metres(-object.width / 2)"
          :y="metres(-object.depth / 2)"
          :width="metres(object.width)"
          :height="metres(object.depth)"
          :rx="Math.min(6, metres(0.08))"
          :fill="fixtureFill[object.type] ?? '#d6d3d1'"
          stroke="#fafaf9"
          stroke-width="1"
        />
      </g>
      <polyline
        v-if="draftPoints"
        :points="draftPoints"
        fill="none"
        stroke="#fbbf24"
        stroke-width="2"
      />
      <g v-for="spawn in scene.spawns" :key="spawn.id">
        <line
          :x1="screenOf(spawn.point).x"
          :y1="screenOf(spawn.point).y"
          :x2="facingEnd(spawn.point, spawn.rotationY).x"
          :y2="facingEnd(spawn.point, spawn.rotationY).y"
          :stroke="spawn.role === 'exit' ? '#fb7185' : '#38bdf8'"
          stroke-width="2"
          stroke-linecap="round"
        />
        <circle
          :cx="screenOf(spawn.point).x"
          :cy="screenOf(spawn.point).y"
          r="8"
          :fill="spawn.role === 'exit' ? '#fb7185' : '#38bdf8'"
          :stroke="chosen(spawn.id) ? '#22d3ee' : '#fafafa'"
          stroke-width="1.5"
        />
        <circle
          :cx="screenOf(spawn.point).x"
          :cy="screenOf(spawn.point).y"
          r="2.5"
          fill="#fafafa"
        />
        <text
          :x="screenOf(spawn.point).x + 12"
          :y="screenOf(spawn.point).y + 4"
          fill="#e4e4e7"
          font-size="11"
        >
          {{ spawn.name }}
        </text>
      </g>
      <g v-for="room in scene.rooms" :key="`${room.id}-label`">
        <rect
          :x="screenOf(labelAt(room.points)).x - labelWidth(room.name) / 2"
          :y="screenOf(labelAt(room.points)).y - 11"
          :width="labelWidth(room.name)"
          height="20"
          rx="6"
          fill="#052e16"
          fill-opacity="0.88"
        />
        <text
          :x="screenOf(labelAt(room.points)).x"
          :y="screenOf(labelAt(room.points)).y + 3"
          fill="#dcfce7"
          font-size="12"
          text-anchor="middle"
        >
          {{ room.name }}
        </text>
      </g>
      <g v-for="zone in scene.zones" :key="`${zone.id}-label`">
        <text
          :x="screenOf(labelAt(zone.points)).x"
          :y="screenOf(labelAt(zone.points)).y"
          fill="#ede9fe"
          font-size="11"
          text-anchor="middle"
        >
          {{ zone.name }}
        </text>
      </g>
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
