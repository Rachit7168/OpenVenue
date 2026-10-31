<script setup lang="ts">
import {
  addObject,
  addRoom,
  addSpawn,
  addWall,
  addZone,
  deleteObject,
  deleteRoom,
  deleteSpawn,
  deleteWall,
  deleteZone,
  groupCommands,
  moveObject,
  planRectangularRoom,
  updateWall,
  type EditorCommand,
} from "@openvenue/editor-core";
import { distance, snapPoint, wallLength, type Vec2 } from "@openvenue/geometry";
import type { PlanPoint } from "@openvenue/renderer-2d";
import type { Polygon, VenueDocument } from "@openvenue/scene-schema";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { commitPolygon, rectangleFromCorners } from "../plan/draw";
import { hitPlan, type PlanHit } from "../plan/hit";
import { planScene } from "../plan/model";
import { useVenueStore } from "../stores/venue";
import FloorPlan from "./FloorPlan.vue";

const store = useVenueStore();

const tools = [
  ["select", "Select"],
  ["pan", "Pan"],
  ["wall", "Wall"],
  ["rect", "Room"],
  ["polygon", "Polygon"],
  ["zone", "Zone"],
  ["door", "Door"],
  ["table", "Table"],
  ["entrance", "Entrance"],
  ["exit", "Exit"],
] as const;

type Tool = (typeof tools)[number][0];

const tool = ref<Tool>("select");
const draft = ref<PlanPoint[]>([]);
const preview = ref<PlanPoint | null>(null);
const movingId = ref<string | null>(null);
const mergingMove = ref(false);
const note = ref("Middle-drag pans. Scroll zooms. Delete removes the selection.");

const selectionSummary = computed(() => {
  const id = store.selection[0];
  if (!id) {
    return "";
  }
  const scene = planScene(store.document);
  const object = scene.objects.find((item) => item.id === id);
  if (object) {
    return `${object.name} · ${object.type} · ${object.width.toFixed(2)} × ${object.depth.toFixed(2)} m`;
  }
  const room = scene.rooms.find((item) => item.id === id);
  if (room) {
    return `${room.name} · room · ${spanLabel(room.points)}`;
  }
  const zone = scene.zones.find((item) => item.id === id);
  if (zone) {
    return `${zone.name} · zone · ${spanLabel(zone.points)}`;
  }
  if (scene.walls.some((item) => item.id === id)) {
    const wall = scene.walls.find((item) => item.id === id);
    return wall ? `Wall · ${wallLength({ start: wall.start, end: wall.end }).toFixed(2)} m` : "";
  }
  const spawn = scene.spawns.find((item) => item.id === id);
  return spawn ? `${spawn.name} · ${spawn.role}` : "";
});

function spanLabel(points: PlanPoint[]): string {
  const xs = points.map((point) => point.x);
  const zs = points.map((point) => point.z);
  const width = Math.max(...xs) - Math.min(...xs);
  const depth = Math.max(...zs) - Math.min(...zs);
  return `${width.toFixed(1)} × ${depth.toFixed(1)} m`;
}

const shownDraft = computed(() => {
  const start = draft.value[0];
  if (!preview.value || !start) {
    return draft.value;
  }
  if (tool.value === "rect") {
    return [
      start,
      { x: preview.value.x, z: start.z },
      preview.value,
      { x: start.x, z: preview.value.z },
    ];
  }
  if (tool.value === "wall" || tool.value === "polygon" || tool.value === "zone") {
    return [...draft.value, preview.value];
  }
  return draft.value;
});

const lengthLabel = computed(() => {
  const start = draft.value[0];
  if (!start || !preview.value || tool.value === "select" || tool.value === "pan") {
    return "";
  }
  if (tool.value === "rect") {
    const width = Math.abs(preview.value.x - start.x);
    const depth = Math.abs(preview.value.z - start.z);
    return `${width.toFixed(2)} × ${depth.toFixed(2)} m`;
  }
  const last = draft.value[draft.value.length - 1] ?? start;
  return `${wallLength({ start: last, end: preview.value }).toFixed(2)} m`;
});

function floorOf(document: VenueDocument) {
  return document.venue.floors[0];
}

function place(point: PlanPoint): PlanPoint {
  const floor = floorOf(store.document);
  const walls =
    floor?.walls.map((wall) => ({
      id: wall.id,
      start: { x: wall.start.x, z: wall.start.z },
      end: { x: wall.end.x, z: wall.end.z },
    })) ?? [];
  return snapPoint(point, walls).point;
}

function run(command: EditorCommand) {
  store.execute(command);
  note.value = store.status;
}

function schemaPoint(value: PlanPoint) {
  return { x: value.x, z: value.z };
}

function asPolygon(points: PlanPoint[]): Polygon {
  const [first, second, third, ...rest] = points.map(schemaPoint);
  if (!first || !second || !third) {
    throw new Error("A polygon needs at least three points");
  }
  return [first, second, third, ...rest];
}

function addRing(kind: "room" | "zone", points: PlanPoint[]) {
  const floor = floorOf(store.document);
  if (!floor || points.length < 3) {
    return;
  }
  if (kind === "zone") {
    run(
      addZone(floor.id, {
        id: crypto.randomUUID(),
        type: "zone",
        name: "Zone",
        boundary: asPolygon(points),
        interaction: { type: "none" },
      }),
    );
    return;
  }
  const ids = points.map(() => crypto.randomUUID()) as [string, string, string, ...string[]];
  const walls = points.map((start, index) => {
    const end = points[(index + 1) % points.length] ?? start;
    return {
      id: ids[index] ?? crypto.randomUUID(),
      start: schemaPoint(start),
      end: schemaPoint(end),
      thickness: 0.2,
      height: floor.height,
    };
  });
  run(
    groupCommands("ADD_ROOM", [
      ...walls.map((wall) => addWall(floor.id, wall)),
      addRoom(floor.id, {
        id: crypto.randomUUID(),
        name: "Room",
        boundary: asPolygon(points),
        wallIds: walls.map((wall) => wall.id),
      }),
    ]),
  );
}

function onDown(point: PlanPoint) {
  const snapped = place(point);
  const floor = floorOf(store.document);
  if (!floor) {
    return;
  }
  if (tool.value === "select") {
    const hit = hitPlan(planScene(store.document), snapped);
    store.setSelection(hit ? [hit.id] : []);
    movingId.value = hit?.kind === "object" ? hit.id : null;
    mergingMove.value = false;
    note.value = hit ? `Selected ${hit.kind}` : "Nothing selected";
    return;
  }
  if (tool.value === "table") {
    run(
      addObject(floor.id, {
        id: crypto.randomUUID(),
        type: "table",
        name: "Table",
        transform: {
          position: { x: snapped.x, y: 0, z: snapped.z },
          rotation: { x: 0, y: 0, z: 0 },
        },
        dimensions: { width: 1.2, height: 0.75, depth: 0.8 },
      }),
    );
    return;
  }
  if (tool.value === "entrance" || tool.value === "exit") {
    run(
      addSpawn({
        id: crypto.randomUUID(),
        name: tool.value === "exit" ? "Exit" : "Entrance",
        floorId: floor.id,
        position: { x: snapped.x, y: 0, z: snapped.z },
        rotationY: 0,
        role: tool.value === "exit" ? "exit" : "visitor",
      }),
    );
    return;
  }
  if (tool.value === "door") {
    placeDoor(snapped, floor.id);
    return;
  }
  if (tool.value === "wall") {
    const start = draft.value[0];
    if (!start) {
      draft.value = [snapped];
      return;
    }
    if (distance(start as Vec2, snapped as Vec2) < 0.2) {
      note.value = "Wall is too short.";
      return;
    }
    run(
      addWall(floor.id, {
        id: crypto.randomUUID(),
        start: schemaPoint(start),
        end: schemaPoint(snapped),
        thickness: 0.2,
        height: floor.height,
      }),
    );
    draft.value = [];
    preview.value = null;
    return;
  }
  if (tool.value === "rect") {
    const start = draft.value[0];
    if (!start) {
      draft.value = [snapped];
      return;
    }
    const rectangle = rectangleFromCorners(start, snapped);
    if (!rectangle) {
      note.value = "Room is too small.";
      return;
    }
    const planned = planRectangularRoom({
      name: "Room",
      width: rectangle.width,
      depth: rectangle.depth,
      origin: rectangle.origin,
      height: floor.height,
      roomId: crypto.randomUUID(),
      wallIds: [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()],
    });
    run(
      groupCommands("ADD_ROOM", [
        ...planned.walls.map((wall) => addWall(floor.id, wall)),
        addRoom(floor.id, planned.room),
      ]),
    );
    draft.value = [];
    preview.value = null;
    return;
  }
  if (tool.value === "polygon" || tool.value === "zone") {
    const result = commitPolygon(draft.value, snapped);
    if (result && "error" in result) {
      note.value = result.error;
      return;
    }
    if (result && "points" in result) {
      addRing(tool.value === "zone" ? "zone" : "room", result.points);
      draft.value = [];
      preview.value = null;
      return;
    }
    draft.value = [...draft.value, snapped];
  }
}

function onMove(point: PlanPoint) {
  const snapped = place(point);
  if (movingId.value) {
    store.execute(
      moveObject(store.document, movingId.value, {
        x: snapped.x,
        y: 0,
        z: snapped.z,
      }),
      { merge: mergingMove.value },
    );
    mergingMove.value = true;
    note.value = store.status;
    return;
  }
  if (draft.value.length > 0) {
    preview.value = snapped;
  }
}

function onUp() {
  movingId.value = null;
  mergingMove.value = false;
}

function placeDoor(point: PlanPoint, floorId: string) {
  const floor = store.document.venue.floors.find((item) => item.id === floorId);
  if (!floor) {
    return;
  }
  let best: { id: string; along: number; length: number; gap: number } | null = null;
  for (const wall of floor.walls) {
    const start = { x: wall.start.x, z: wall.start.z };
    const end = { x: wall.end.x, z: wall.end.z };
    const length = wallLength({ start, end });
    if (length < 1) {
      continue;
    }
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const t = Math.min(
      1,
      Math.max(0, ((point.x - start.x) * dx + (point.z - start.z) * dz) / (length * length)),
    );
    const projected = { x: start.x + t * dx, z: start.z + t * dz };
    const gap = distance(point as Vec2, projected);
    if (gap <= 0.5 && (best === null || gap < best.gap)) {
      best = { id: wall.id, along: t * length, length, gap };
    }
  }
  if (!best) {
    note.value = "Click closer to a wall.";
    return;
  }
  const width = 0.9;
  const offset = Math.min(Math.max(best.along - width / 2, 0), best.length - width);
  const wall = floor.walls.find((item) => item.id === best?.id);
  if (!wall) {
    return;
  }
  run(
    updateWall(store.document, wall.id, {
      ...wall,
      openings: [
        ...(wall.openings ?? []),
        { id: crypto.randomUUID(), kind: "door", offset, width, height: 2.1 },
      ],
    }),
  );
}

function removeSelection() {
  const id = store.selection[0];
  if (!id) {
    return;
  }
  const scene = planScene(store.document);
  const hit: PlanHit | null = scene.objects.some((item) => item.id === id)
    ? { kind: "object", id }
    : scene.walls.some((item) => item.id === id)
      ? { kind: "wall", id }
      : scene.rooms.some((item) => item.id === id)
        ? { kind: "room", id }
        : scene.zones.some((item) => item.id === id)
          ? { kind: "zone", id }
          : scene.spawns.some((item) => item.id === id)
            ? { kind: "spawn", id }
            : null;
  if (!hit) {
    return;
  }
  const document = store.document;
  if (hit.kind === "object") {
    run(deleteObject(document, id));
  } else if (hit.kind === "wall") {
    run(deleteWall(document, id));
    if (store.status.includes("part of a room")) {
      note.value = "That wall belongs to a room. Delete the room first.";
    }
  } else if (hit.kind === "room") {
    run(deleteRoom(document, id));
  } else if (hit.kind === "zone") {
    run(deleteZone(document, id));
  } else {
    run(deleteSpawn(document, id));
  }
  store.setSelection([]);
}

function undo() {
  store.undo();
  note.value = store.status;
}

function redo() {
  store.redo();
  note.value = store.status;
}

function onKey(event: KeyboardEvent) {
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return;
  }
  if (event.key === "Escape") {
    draft.value = [];
    preview.value = null;
    movingId.value = null;
  } else if (event.key === "Delete" || event.key === "Backspace") {
    event.preventDefault();
    removeSelection();
  } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    if (event.shiftKey) {
      redo();
    } else {
      undo();
    }
  }
}

onMounted(() => window.addEventListener("keydown", onKey));
onBeforeUnmount(() => window.removeEventListener("keydown", onKey));
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="flex flex-wrap items-center gap-1 border-b border-zinc-800 bg-zinc-900 px-2 py-2">
      <button
        v-for="[id, label] in tools"
        :key="id"
        type="button"
        class="rounded-md px-2 py-1 text-xs font-medium"
        :class="tool === id ? 'bg-teal-400 text-zinc-950' : 'text-zinc-200 hover:bg-zinc-800'"
        :data-testid="`tool-${id}`"
        @click="tool = id"
      >
        {{ label }}
      </button>
      <span class="mx-1 h-4 w-px bg-zinc-700" />
      <button
        type="button"
        class="rounded-md px-2 py-1 text-xs font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
        :disabled="!store.canUndo"
        @click="undo()"
      >
        Undo
      </button>
      <button
        type="button"
        class="rounded-md px-2 py-1 text-xs font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
        :disabled="!store.canRedo"
        @click="redo()"
      >
        Redo
      </button>
      <span v-if="lengthLabel" class="ml-auto font-mono text-xs text-amber-200">{{
        lengthLabel
      }}</span>
    </div>
    <FloorPlan
      class="min-h-0 flex-1"
      :document="store.document"
      :tool="tool === 'entrance' || tool === 'exit' ? 'spawn' : tool"
      :draft="shownDraft"
      :selected-ids="[...store.selection]"
      @down="onDown"
      @move="onMove"
      @up="onUp"
    />
    <p
      class="flex justify-between gap-3 border-t border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400"
    >
      <span class="text-zinc-200">{{ selectionSummary || "Nothing selected" }}</span>
      <span>{{ note }}</span>
    </p>
  </div>
</template>
