<script setup lang="ts">
import {
  groupCommands,
  moveObject,
  renameEntity,
  resizeObject,
  rotateObject,
  setEntityFlag,
  updateMaterial,
  updateZone,
} from "@openvenue/editor-core";
import type { Interaction, Zone } from "@openvenue/scene-schema";
import { computed } from "vue";
import { useVenueStore } from "../stores/venue";

const store = useVenueStore();

const interactions = ["none", "info-panel", "link", "menu", "session-list"] as const;

const floor = computed(() => store.document.venue.floors[0]);

const selectedObjects = computed(
  () => floor.value?.objects.filter((object) => store.selection.includes(object.id)) ?? [],
);

const focusId = computed(() => (store.selection.length === 1 ? store.selection[0] : undefined));

const room = computed(() => floor.value?.rooms.find((item) => item.id === focusId.value));
const zone = computed(() => floor.value?.zones.find((item) => item.id === focusId.value));
const object = computed(() => floor.value?.objects.find((item) => item.id === focusId.value));
const spawn = computed(() =>
  store.document.venue.spawnPoints.find((item) => item.id === focusId.value),
);

const hidden = computed(() => {
  const current = floor.value;
  if (!current) {
    return [];
  }
  return [
    ...current.rooms,
    ...current.zones,
    ...current.objects,
    ...store.document.venue.spawnPoints,
  ].filter((item) => item.visible === false);
});

const floorMaterials = ["concrete", "wood", "carpet", "glass"];

const yawDegrees = computed(() =>
  object.value ? Math.round((object.value.transform.rotation.y * 180) / Math.PI) : 0,
);

function text(event: Event): string {
  return event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement
    ? event.target.value
    : "";
}

function numeric(event: Event): number | null {
  const value = Number(text(event));
  return Number.isFinite(value) ? value : null;
}

function run(command: Parameters<typeof store.execute>[0]) {
  store.execute(command);
}

function commitName(event: Event) {
  const id = focusId.value;
  const name = text(event).trim();
  if (!id || name.length < 1) {
    return;
  }
  run(renameEntity(store.document, id, name));
}

function commitAxis(axis: "x" | "z", event: Event) {
  const current = object.value;
  const value = numeric(event);
  if (!current || value === null) {
    return;
  }
  run(
    moveObject(store.document, current.id, {
      x: axis === "x" ? value : current.transform.position.x,
      y: current.transform.position.y,
      z: axis === "z" ? value : current.transform.position.z,
    }),
  );
}

function commitYaw(event: Event) {
  const current = object.value;
  const value = numeric(event);
  if (!current || value === null) {
    return;
  }
  run(
    rotateObject(store.document, current.id, {
      x: current.transform.rotation.x,
      y: (value * Math.PI) / 180,
      z: current.transform.rotation.z,
    }),
  );
}

function commitSize(key: "width" | "depth" | "height", event: Event) {
  const current = object.value;
  const value = numeric(event);
  if (!current || value === null || value <= 0) {
    return;
  }
  const dimensions = current.dimensions ?? { width: 0.6, height: 0.75, depth: 0.6 };
  run(resizeObject(store.document, current.id, { ...dimensions, [key]: value }));
}

function commitMaterial(event: Event) {
  const current = room.value;
  const material = text(event).trim();
  if (!current || material.length < 1) {
    return;
  }
  run(updateMaterial(store.document, current.id, material));
}

function commitZone(next: Zone) {
  const current = zone.value;
  if (!current) {
    return;
  }
  run(updateZone(store.document, current.id, next));
}

function commitInteraction(event: Event) {
  const current = zone.value;
  if (!current) {
    return;
  }
  const type = text(event);
  const interaction: Interaction =
    type === "none"
      ? { type: "none" }
      : {
          type: type as Exclude<Interaction["type"], "none">,
          contentRef:
            current.interaction && current.interaction.type !== "none"
              ? current.interaction.contentRef
              : "content/zone.json",
        };
  commitZone({ ...current, interaction });
}

function commitContent(event: Event) {
  const current = zone.value;
  const contentRef = text(event).trim();
  if (
    !current ||
    contentRef.length < 1 ||
    !current.interaction ||
    current.interaction.type === "none"
  ) {
    return;
  }
  commitZone({
    ...current,
    interaction: { type: current.interaction.type, contentRef },
  });
}

function commitColor(event: Event) {
  const current = zone.value;
  if (!current) {
    return;
  }
  commitZone({ ...current, color: text(event) });
}

function commitFlag(flag: "locked" | "visible", event: Event) {
  const id = focusId.value;
  if (!id || !(event.target instanceof HTMLInputElement)) {
    return;
  }
  run(setEntityFlag(store.document, id, flag, event.target.checked));
}

function align(mode: "min" | "center") {
  const items = selectedObjects.value.filter((item) => item.locked !== true);
  if (items.length < 2) {
    return;
  }
  const xs = items.map((item) => item.transform.position.x);
  const target =
    mode === "min" ? Math.min(...xs) : xs.reduce((sum, value) => sum + value, 0) / xs.length;
  store.execute(
    groupCommands(
      "MOVE_OBJECT",
      items.map((item) =>
        moveObject(store.document, item.id, {
          x: target,
          y: item.transform.position.y,
          z: item.transform.position.z,
        }),
      ),
    ),
  );
}

function distribute() {
  const items = selectedObjects.value
    .filter((item) => item.locked !== true)
    .slice()
    .sort((a, b) => a.transform.position.x - b.transform.position.x);
  const first = items[0];
  const last = items[items.length - 1];
  if (!first || !last || items.length < 3) {
    return;
  }
  const step = (last.transform.position.x - first.transform.position.x) / (items.length - 1);
  store.execute(
    groupCommands(
      "MOVE_OBJECT",
      items.map((item, index) =>
        moveObject(store.document, item.id, {
          x: first.transform.position.x + step * index,
          y: item.transform.position.y,
          z: item.transform.position.z,
        }),
      ),
    ),
  );
}
</script>

<template>
  <aside
    class="flex h-full w-full flex-col overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-200"
  >
    <h2 class="text-xs font-semibold uppercase tracking-wide text-zinc-400">Inspector</h2>
    <p v-if="store.selection.length > 1" class="mt-3 text-zinc-300">
      {{ store.selection.length }} selected
    </p>
    <p v-else-if="!room && !zone && !object && !spawn" class="mt-3 text-zinc-400">
      Select a room, table, or zone. Shift-click adds to the selection. Drag on empty floor to
      box-select.
    </p>

    <div v-if="selectedObjects.length > 1" class="mt-3 flex flex-wrap gap-2">
      <button type="button" class="rounded-md bg-zinc-800 px-2 py-1 text-xs" @click="align('min')">
        Align left
      </button>
      <button
        type="button"
        class="rounded-md bg-zinc-800 px-2 py-1 text-xs"
        @click="align('center')"
      >
        Align center
      </button>
      <button type="button" class="rounded-md bg-zinc-800 px-2 py-1 text-xs" @click="distribute">
        Distribute
      </button>
    </div>

    <form v-if="room || zone || object || spawn" class="mt-4 space-y-3" @submit.prevent>
      <label class="block text-xs text-zinc-400">
        Name
        <input
          class="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
          :value="room?.name ?? zone?.name ?? object?.name ?? spawn?.name"
          @change="commitName"
        />
      </label>

      <label v-if="room" class="block text-xs text-zinc-400">
        Floor material
        <select
          class="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm"
          :value="room.floorMaterial ?? 'carpet'"
          @change="commitMaterial"
        >
          <option v-for="name in floorMaterials" :key="name" :value="name">{{ name }}</option>
          <option
            v-if="room.floorMaterial && !floorMaterials.includes(room.floorMaterial)"
            :value="room.floorMaterial"
          >
            {{ room.floorMaterial }}
          </option>
        </select>
      </label>

      <template v-if="object">
        <div class="grid grid-cols-2 gap-2">
          <label class="text-xs text-zinc-400">
            X
            <input
              class="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1"
              :value="object.transform.position.x"
              @change="commitAxis('x', $event)"
            />
          </label>
          <label class="text-xs text-zinc-400">
            Z
            <input
              class="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1"
              :value="object.transform.position.z"
              @change="commitAxis('z', $event)"
            />
          </label>
          <label class="text-xs text-zinc-400">
            Rotation °
            <input
              class="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1"
              :value="yawDegrees"
              @change="commitYaw"
            />
          </label>
          <label class="text-xs text-zinc-400">
            Width
            <input
              class="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1"
              :value="object.dimensions?.width ?? 0.6"
              @change="commitSize('width', $event)"
            />
          </label>
          <label class="text-xs text-zinc-400">
            Depth
            <input
              class="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1"
              :value="object.dimensions?.depth ?? 0.6"
              @change="commitSize('depth', $event)"
            />
          </label>
          <label class="text-xs text-zinc-400">
            Height
            <input
              class="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1"
              :value="object.dimensions?.height ?? 0.75"
              @change="commitSize('height', $event)"
            />
          </label>
        </div>
      </template>

      <template v-if="zone">
        <label class="block text-xs text-zinc-400">
          Interaction
          <select
            class="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1"
            :value="zone.interaction?.type ?? 'none'"
            @change="commitInteraction"
          >
            <option v-for="kind in interactions" :key="kind" :value="kind">{{ kind }}</option>
          </select>
        </label>
        <label
          v-if="zone.interaction && zone.interaction.type !== 'none'"
          class="block text-xs text-zinc-400"
        >
          Content reference
          <input
            class="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1"
            :value="zone.interaction.contentRef"
            @change="commitContent"
          />
        </label>
        <label class="block text-xs text-zinc-400">
          Colour
          <input
            class="mt-1 h-8 w-full bg-transparent"
            type="color"
            :value="typeof zone.color === 'string' ? zone.color : '#6d28d9'"
            @change="commitColor"
          />
        </label>
      </template>

      <label v-if="focusId" class="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          :checked="(room ?? zone ?? object ?? spawn)?.locked === true"
          @change="commitFlag('locked', $event)"
        />
        Locked
      </label>
      <label v-if="focusId" class="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          :checked="(room ?? zone ?? object ?? spawn)?.visible !== false"
          @change="commitFlag('visible', $event)"
        />
        Visible
      </label>
    </form>

    <div v-if="hidden.length > 0" class="mt-6">
      <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-500">Hidden</h3>
      <button
        v-for="item in hidden"
        :key="item.id"
        type="button"
        class="mt-1 block text-left text-xs text-teal-300 hover:underline"
        @click="store.setSelection([item.id])"
      >
        {{ item.name }}
      </button>
    </div>
  </aside>
</template>
