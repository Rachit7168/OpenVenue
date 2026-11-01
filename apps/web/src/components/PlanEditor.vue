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
  resizeObject,
  rotateObject,
  updateWall,
  type EditorCommand,
} from "@openvenue/editor-core";
import { distance, snapPoint, wallLength, type Vec2 } from "@openvenue/geometry";
import type { PlanPoint } from "@openvenue/renderer-2d";
import type { Polygon, SceneObject, VenueDocument, Zone } from "@openvenue/scene-schema";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { commitPolygon, rectangleFromCorners } from "../plan/draw";
import { hitHandle, idsInsideBox, toLocal } from "../plan/handles";
import { hitPlan, type PlanHit } from "../plan/hit";
import { planScene } from "../plan/model";
import { placeCatalogueAsset } from "../assets/place";
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
const gesture = ref<"move" | "resize" | "rotate" | "box" | null>(null);
const marquee = ref<PlanPoint[]>([]);
const hint = "Middle-drag pans. Scroll zooms. Delete removes the selection.";
const note = ref(hint);

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

const statusMessage = computed(() => (note.value === hint ? selectionSummary.value : note.value));

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

function isLocked(id: string): boolean {
  const floor = floorOf(store.document);
  const entities = [
    ...(floor?.rooms ?? []),
    ...(floor?.zones ?? []),
    ...(floor?.objects ?? []),
    ...store.document.venue.spawnPoints,
  ];
  return entities.find((item) => item.id === id)?.locked === true;
}

function quantize(value: number): number {
  return Math.round(value / 0.05) * 0.05;
}

function onDown(point: PlanPoint, shift = false) {
  const snapped = place(point);
  const floor = floorOf(store.document);
  if (!floor) {
    return;
  }
  if (tool.value === "select") {
    const scene = planScene(store.document);
    const only =
      store.selection.length === 1
        ? scene.objects.find((object) => object.id === store.selection[0])
        : undefined;
    const handle = only && !isLocked(only.id) ? hitHandle(only, point) : null;
    if (handle && only) {
      gesture.value = handle;
      movingId.value = only.id;
      mergingMove.value = false;
      return;
    }
    const hit = hitPlan(scene, snapped);
    if (shift && hit) {
      const ids = store.selection.includes(hit.id)
        ? store.selection.filter((id) => id !== hit.id)
        : [...store.selection, hit.id];
      store.setSelection(ids);
      gesture.value = null;
      movingId.value = null;
      note.value = `${ids.length} selected`;
      return;
    }
    if (hit) {
      store.setSelection([hit.id]);
      const canMove = hit.kind === "object" && !isLocked(hit.id);
      movingId.value = canMove ? hit.id : null;
      gesture.value = canMove ? "move" : null;
      mergingMove.value = false;
      note.value = isLocked(hit.id) ? "That item is locked." : `Selected ${hit.kind}`;
      return;
    }
    store.setSelection([]);
    gesture.value = "box";
    marquee.value = [point, point];
    note.value = "Drag a box to select";
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
  if (gesture.value === "box") {
    const start = marquee.value[0] ?? point;
    marquee.value = [start, point];
    return;
  }
  if ((gesture.value === "resize" || gesture.value === "rotate") && movingId.value) {
    const sceneObject = planScene(store.document).objects.find(
      (item) => item.id === movingId.value,
    );
    const source = floorOf(store.document)?.objects.find((item) => item.id === movingId.value);
    if (!sceneObject || !source) {
      return;
    }
    if (gesture.value === "resize") {
      const local = toLocal(sceneObject.center, sceneObject.yaw, snapped);
      store.execute(
        resizeObject(store.document, source.id, {
          width: Math.max(0.3, quantize(Math.abs(local.x) * 2)),
          height: source.dimensions?.height ?? 0.75,
          depth: Math.max(0.3, quantize(Math.abs(local.z) * 2)),
        }),
        { merge: mergingMove.value },
      );
    } else {
      const step = Math.PI / 12;
      const yaw =
        Math.round(
          Math.atan2(snapped.x - sceneObject.center.x, snapped.z - sceneObject.center.z) / step,
        ) * step;
      store.execute(
        rotateObject(store.document, source.id, {
          x: source.transform.rotation.x,
          y: yaw,
          z: source.transform.rotation.z,
        }),
        { merge: mergingMove.value },
      );
    }
    mergingMove.value = true;
    note.value = store.status;
    return;
  }
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
  if (gesture.value === "box") {
    const [start, end] = marquee.value;
    if (start && end) {
      store.setSelection(idsInsideBox(planScene(store.document), start, end));
      note.value =
        store.selection.length > 0 ? `${store.selection.length} selected` : "Nothing selected";
    }
  }
  movingId.value = null;
  mergingMove.value = false;
  gesture.value = null;
  marquee.value = [];
}

function duplicateSelection() {
  const floor = floorOf(store.document);
  if (!floor) {
    return;
  }
  const created: string[] = [];
  const commands = [];
  for (const id of store.selection) {
    if (isLocked(id)) {
      continue;
    }
    const object = floor.objects.find((item) => item.id === id);
    if (object) {
      const copy = JSON.parse(JSON.stringify(object)) as SceneObject;
      copy.id = crypto.randomUUID();
      copy.name = `${object.name} copy`.slice(0, 200);
      copy.transform.position.x += 0.5;
      copy.transform.position.z += 0.5;
      created.push(copy.id);
      commands.push(addObject(floor.id, copy));
    }
    const zone = floor.zones.find((item) => item.id === id);
    if (zone) {
      const copy = JSON.parse(JSON.stringify(zone)) as Zone;
      copy.id = crypto.randomUUID();
      copy.name = `${zone.name} copy`.slice(0, 200);
      copy.boundary = copy.boundary.map((corner) => ({
        x: corner.x + 0.5,
        z: corner.z + 0.5,
      })) as Polygon;
      created.push(copy.id);
      commands.push(addZone(floor.id, copy));
    }
  }
  if (commands.length === 0) {
    note.value = "Select an unlocked table or zone to duplicate.";
    return;
  }
  run(groupCommands("ADD_OBJECT", commands));
  store.setSelection(created);
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

function removeOne(id: string) {
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
}

function removeSelection() {
  const ids = [...store.selection];
  if (ids.length === 0) {
    return;
  }
  const kept: string[] = [];
  for (const id of ids) {
    if (isLocked(id)) {
      kept.push(id);
      note.value = "That item is locked.";
      continue;
    }
    removeOne(id);
  }
  store.setSelection(kept);
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
  } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d") {
    event.preventDefault();
    duplicateSelection();
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

function onAssetDrop(point: PlanPoint, assetId: string) {
  const name = placeCatalogueAsset(
    (command) => store.execute(command),
    store.document,
    assetId,
    point.x,
    point.z,
  );
  if (name) {
    note.value = `Placed ${name}`;
  }
}

onMounted(() => window.addEventListener("keydown", onKey));
onBeforeUnmount(() => window.removeEventListener("keydown", onKey));
</script>

<template>
  <div class="flex h-full min-h-0 flex-col lg:flex-row">
    <div
      class="flex shrink-0 gap-1 overflow-x-auto border-b border-zinc-800 bg-zinc-900 p-2 lg:w-36 lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r"
    >
      <button
        v-for="[id, label] in tools"
        :key="id"
        type="button"
        class="min-h-10 shrink-0 rounded-md px-3 text-left text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
        :class="tool === id ? 'bg-teal-400 text-zinc-950' : 'text-zinc-200 hover:bg-zinc-800'"
        :data-testid="`tool-${id}`"
        @click="tool = id"
      >
        {{ label }}
      </button>
    </div>
    <div class="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <FloorPlan
        class="min-h-0 flex-1"
        :document="store.document"
        :source="store.scene"
        :tool="tool === 'entrance' || tool === 'exit' ? 'spawn' : tool"
        :draft="shownDraft"
        :selected-ids="[...store.selection]"
        :marquee="marquee"
        :message="statusMessage"
        @down="onDown"
        @move="onMove"
        @up="onUp"
        @drop="onAssetDrop"
      />
      <p
        v-if="lengthLabel"
        class="pointer-events-none absolute right-3 top-3 rounded-md bg-zinc-950/80 px-2 py-1 font-mono text-xs text-amber-200"
      >
        {{ lengthLabel }}
      </p>
    </div>
  </div>
</template>
