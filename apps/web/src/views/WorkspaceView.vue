<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { groupCommands, moveObject, resizeObject, rotateObject } from "@openvenue/editor-core";
import {
  exportVenueGlb,
  type CameraMode,
  type GizmoMode,
  type ObjectPose,
  type QualityMode,
} from "@openvenue/renderer-3d";
import { placeCatalogueAsset } from "../assets/place";
import { planPdf, planPng, planSvg } from "../export/plan";
import AssetLibrary from "../components/AssetLibrary.vue";
import Inspector from "../components/Inspector.vue";
import PlanEditor from "../components/PlanEditor.vue";
import VenueChecks from "../components/VenueChecks.vue";
import VenueStage from "../components/VenueStage.vue";
import { useProjectLibrary } from "../stores/projects";
import { useVenueStore } from "../stores/venue";

const store = useVenueStore();
const library = useProjectLibrary();
const route = useRoute();
const router = useRouter();
const fileInput = ref<HTMLInputElement | null>(null);
const viewMode = ref<"plan" | "stage" | "both">("plan");
const cameraMode = ref<CameraMode>("orbit");
const eyeHeight = ref(1.6);
const gizmoMode = ref<GizmoMode>("translate");
const qualityMode = ref<QualityMode>("high");
const stage = ref<{ fit: () => void; reset: () => void } | null>(null);

const selectedObjectId = computed(() => {
  if (store.selection.length !== 1) {
    return null;
  }
  const id = store.selection[0] ?? null;
  const objects = store.document.venue.floors[0]?.objects ?? [];
  return id && objects.some((object) => object.id === id) ? id : null;
});

function nearly(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-4;
}

function onPlaceAsset(assetId: string, point: { x: number; z: number }) {
  placeCatalogueAsset(store.execute, store.document, assetId, point.x, point.z);
}

function onObjectTransform(id: string, mode: GizmoMode, pose: ObjectPose) {
  const object = store.document.venue.floors[0]?.objects.find((item) => item.id === id);
  if (!object || (object as { locked?: unknown }).locked === true) {
    return;
  }
  if (mode === "translate") {
    const position = object.transform.position;
    if (
      nearly(position.x, pose.position.x) &&
      nearly(position.y, pose.position.y) &&
      nearly(position.z, pose.position.z)
    ) {
      return;
    }
    store.execute(moveObject(store.document, id, pose.position));
    return;
  }
  if (mode === "rotate") {
    const rotation = object.transform.rotation;
    if (
      nearly(rotation.x, pose.rotation.x) &&
      nearly(rotation.y, pose.rotation.y) &&
      nearly(rotation.z, pose.rotation.z)
    ) {
      return;
    }
    store.execute(rotateObject(store.document, id, pose.rotation));
    return;
  }
  const current = object.dimensions;
  const sizeChanged =
    !current ||
    !nearly(current.width, pose.dimensions.width) ||
    !nearly(current.height, pose.dimensions.height) ||
    !nearly(current.depth, pose.dimensions.depth);
  const position = object.transform.position;
  const positionChanged =
    !nearly(position.x, pose.position.x) ||
    !nearly(position.y, pose.position.y) ||
    !nearly(position.z, pose.position.z);
  const steps = [];
  if (sizeChanged) {
    steps.push(resizeObject(store.document, id, pose.dimensions));
  }
  if (positionChanged) {
    steps.push(moveObject(store.document, id, pose.position));
  }
  const command = steps.length === 1 ? steps[0] : null;
  if (command) {
    store.execute(command);
  } else if (steps.length > 1) {
    store.execute(groupCommands("RESIZE_OBJECT", steps));
  }
}

const projectId = String(route.params.projectId ?? "");
const opened = library.find(projectId);
if (opened) {
  store.openDocument(opened);
} else {
  void router.replace("/");
}

watch(
  () => store.document,
  (document) => {
    library.save(document);
    if (route.params.projectId !== document.project.id) {
      void router.replace({ name: "project", params: { projectId: document.project.id } });
    }
  },
  { deep: true },
);

const preview = computed(() => JSON.stringify(store.document, null, 2));
const saveLabel = computed(() => {
  switch (library.saveState) {
    case "pending":
    case "saving":
      return "Saving…";
    case "saved":
      return "Saved in this browser";
    case "restored":
      return "Restored the last session";
    case "error":
      return "Save failed";
    default:
      return "";
  }
});

const counts = computed(() => {
  const floors = store.document.venue.floors;
  const total = (pick: "rooms" | "walls" | "objects" | "zones") =>
    floors.reduce((sum, floor) => sum + floor[pick].length, 0);
  return {
    floors: floors.length,
    rooms: total("rooms"),
    walls: total("walls"),
    objects: total("objects"),
    zones: total("zones"),
    spawns: store.document.venue.spawnPoints.length,
  };
});

const stats = computed(() => [
  { label: "Schema", value: store.document.schemaVersion },
  { label: "Floors", value: counts.value.floors },
  { label: "Rooms", value: counts.value.rooms },
  { label: "Walls", value: counts.value.walls },
  { label: "Objects", value: counts.value.objects },
  { label: "Zones", value: counts.value.zones },
]);

function onProjectName(event: Event) {
  if (event.target instanceof HTMLInputElement) {
    store.renameProject(event.target.value);
  }
}

function onVenueName(event: Event) {
  if (event.target instanceof HTMLInputElement) {
    store.renameVenue(event.target.value);
  }
}

function confirmReplace() {
  if (store.status !== "Unsaved changes") {
    return true;
  }
  return window.confirm("This venue has unsaved changes. Replace it?");
}

function openPicker() {
  if (!confirmReplace()) {
    return;
  }
  fileInput.value?.click();
}

function requestNew() {
  if (!confirmReplace()) {
    return;
  }
  store.createNew();
}

function onFile(event: Event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) {
    return;
  }
  const file = input.files?.[0];
  input.value = "";
  if (!file) {
    return;
  }
  if (file.size > store.maxFileChars) {
    store.reportLoadFailure(`File is larger than ${store.maxFileChars} characters.`);
    return;
  }
  const token = store.startLoad();
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") {
      store.loadJson(reader.result, file.name, token);
    }
  };
  reader.onerror = () => {
    store.reportLoadFailure("Could not read that file.", token);
  };
  reader.onabort = () => {
    store.reportLoadFailure("File read was cancelled.", token);
  };
  reader.readAsText(file);
}

const exportOpen = ref(false);
const exportError = ref("");

function download(bytes: string | Uint8Array, type: string, filename: string) {
  const body: BlobPart =
    typeof bytes === "string"
      ? bytes
      : (() => {
          const copy = new ArrayBuffer(bytes.byteLength);
          new Uint8Array(copy).set(bytes);
          return copy;
        })();
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function venueFile(extension: string): string {
  const name = store.document.venue.name.trim() || "venue";
  return `${name.replace(/[^\w.-]+/g, "-")}.${extension}`;
}

function save() {
  const json = store.toJson();
  if (!json) {
    return;
  }
  download(
    json,
    "application/json",
    store.fileName.endsWith(".json") ? store.fileName : "venue.json",
  );
  store.markSaved(store.fileName.endsWith(".json") ? store.fileName : "venue.json");
}

function saveSvg() {
  download(planSvg(store.document), "image/svg+xml", venueFile("svg"));
}

function savePng() {
  download(planPng(store.document), "image/png", venueFile("png"));
}

function savePdf() {
  download(planPdf(store.document), "application/pdf", venueFile("pdf"));
}

async function saveGlb() {
  exportError.value = "";
  try {
    download(await exportVenueGlb(store.document), "model/gltf-binary", venueFile("glb"));
  } catch (error) {
    exportError.value = error instanceof Error ? error.message : "The hall could not be exported.";
  }
}
</script>

<template>
  <main class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <RouterLink
          to="/"
          class="text-sm font-medium text-teal-800 hover:underline dark:text-teal-300"
        >
          All projects
        </RouterLink>
        <h1 class="mt-1 text-2xl font-semibold tracking-tight">Workspace</h1>
        <p class="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Draw walls, rooms, zones, doors, and tables on the plan. The inspector edits the
          selection. Switch to 3D to walk around the same hall. Lengths are metres, with +Z up the
          screen.
        </p>
        <div class="mt-3 flex gap-2">
          <button
            type="button"
            class="rounded-md px-3 py-1 text-sm font-medium"
            :class="viewMode === 'plan' ? 'bg-teal-400 text-zinc-950' : 'bg-zinc-800 text-zinc-100'"
            @click="viewMode = 'plan'"
          >
            Plan
          </button>
          <button
            type="button"
            class="rounded-md px-3 py-1 text-sm font-medium"
            :class="
              viewMode === 'stage' ? 'bg-teal-400 text-zinc-950' : 'bg-zinc-800 text-zinc-100'
            "
            data-testid="view-3d"
            @click="viewMode = 'stage'"
          >
            3D
          </button>
          <button
            type="button"
            class="rounded-md px-3 py-1 text-sm font-medium"
            :class="viewMode === 'both' ? 'bg-teal-400 text-zinc-950' : 'bg-zinc-800 text-zinc-100'"
            data-testid="view-both"
            @click="viewMode = 'both'"
          >
            Both
          </button>
          <template v-if="viewMode !== 'plan'">
            <button
              type="button"
              class="rounded-md px-3 py-1 text-sm font-medium"
              :class="
                cameraMode === 'orbit' ? 'bg-teal-400 text-zinc-950' : 'bg-zinc-800 text-zinc-100'
              "
              @click="cameraMode = 'orbit'"
            >
              Orbit
            </button>
            <button
              type="button"
              class="rounded-md px-3 py-1 text-sm font-medium"
              :class="
                cameraMode === 'isometric'
                  ? 'bg-teal-400 text-zinc-950'
                  : 'bg-zinc-800 text-zinc-100'
              "
              data-testid="camera-isometric"
              @click="cameraMode = 'isometric'"
            >
              Isometric
            </button>
            <button
              type="button"
              class="rounded-md px-3 py-1 text-sm font-medium"
              :class="
                cameraMode === 'walk' ? 'bg-teal-400 text-zinc-950' : 'bg-zinc-800 text-zinc-100'
              "
              data-testid="camera-walk"
              @click="cameraMode = 'walk'"
            >
              Walk
            </button>
            <label
              v-if="cameraMode === 'walk'"
              class="flex items-center gap-1 text-xs text-zinc-300"
            >
              Eye
              <input
                v-model.number="eyeHeight"
                class="w-16 rounded-md border border-zinc-700 bg-zinc-950 px-1 py-1 text-sm text-zinc-100"
                type="number"
                min="0.4"
                max="2.4"
                step="0.1"
                data-testid="eye-height"
                aria-label="Eye height in metres"
              />
            </label>
            <button
              v-if="cameraMode !== 'walk'"
              type="button"
              class="rounded-md px-3 py-1 text-sm font-medium"
              :class="
                gizmoMode === 'translate'
                  ? 'bg-teal-400 text-zinc-950'
                  : 'bg-zinc-800 text-zinc-100'
              "
              @click="gizmoMode = 'translate'"
            >
              Move
            </button>
            <button
              v-if="cameraMode !== 'walk'"
              type="button"
              class="rounded-md px-3 py-1 text-sm font-medium"
              :class="
                gizmoMode === 'rotate' ? 'bg-teal-400 text-zinc-950' : 'bg-zinc-800 text-zinc-100'
              "
              @click="gizmoMode = 'rotate'"
            >
              Rotate
            </button>
            <button
              v-if="cameraMode !== 'walk'"
              type="button"
              class="rounded-md px-3 py-1 text-sm font-medium"
              :class="
                gizmoMode === 'scale' ? 'bg-teal-400 text-zinc-950' : 'bg-zinc-800 text-zinc-100'
              "
              data-testid="gizmo-scale"
              @click="gizmoMode = 'scale'"
            >
              Scale
            </button>
            <button
              type="button"
              class="rounded-md px-3 py-1 text-sm font-medium"
              :class="
                qualityMode === 'simple' ? 'bg-teal-400 text-zinc-950' : 'bg-zinc-800 text-zinc-100'
              "
              data-testid="quality-simple"
              @click="qualityMode = 'simple'"
            >
              Simple
            </button>
            <button
              type="button"
              class="rounded-md px-3 py-1 text-sm font-medium"
              :class="
                qualityMode === 'high' ? 'bg-teal-400 text-zinc-950' : 'bg-zinc-800 text-zinc-100'
              "
              data-testid="quality-high"
              @click="qualityMode = 'high'"
            >
              High
            </button>
            <button
              type="button"
              class="rounded-md bg-zinc-800 px-3 py-1 text-sm font-medium text-zinc-100"
              @click="stage?.fit()"
            >
              Fit
            </button>
            <button
              type="button"
              class="rounded-md bg-zinc-800 px-3 py-1 text-sm font-medium text-zinc-100"
              @click="stage?.reset()"
            >
              Reset
            </button>
          </template>
          <button
            v-if="viewMode !== 'plan'"
            type="button"
            class="rounded-md bg-zinc-800 px-3 py-1 text-sm font-medium text-zinc-100 disabled:opacity-40"
            :disabled="!store.canUndo"
            @click="store.undo()"
          >
            Undo
          </button>
          <button
            v-if="viewMode !== 'plan'"
            type="button"
            class="rounded-md bg-zinc-800 px-3 py-1 text-sm font-medium text-zinc-100 disabled:opacity-40"
            :disabled="!store.canRedo"
            @click="store.redo()"
          >
            Redo
          </button>
        </div>
        <p
          v-if="cameraMode === 'walk'"
          class="mt-2 text-xs text-zinc-500 dark:text-zinc-400"
          data-testid="walk-hint"
        >
          Click the hall to look. WASD walks. Escape returns to orbit.
        </p>
      </div>
      <p class="text-sm text-zinc-500 dark:text-zinc-400" aria-live="polite">
        {{ store.status }}
        <span v-if="saveLabel" data-testid="save-status"> · {{ saveLabel }}</span>
      </p>
    </div>

    <AssetLibrary class="mt-4" />

    <section
      class="mt-6 flex h-[36rem] overflow-hidden rounded-xl border border-zinc-800 shadow-sm"
    >
      <PlanEditor v-show="viewMode !== 'stage'" class="min-h-0 min-w-0 flex-1" />
      <VenueStage
        v-show="viewMode !== 'plan'"
        ref="stage"
        class="min-h-0 min-w-0 flex-1"
        :scene="store.scene"
        :camera-mode="cameraMode"
        :eye-height="eyeHeight"
        :gizmo-mode="gizmoMode"
        :quality-mode="qualityMode"
        :selected-id="selectedObjectId"
        @exit-walk="cameraMode = 'orbit'"
        @select="store.setSelection($event ? [$event] : [])"
        @transform="onObjectTransform"
        @place="onPlaceAsset"
      />
      <Inspector />
    </section>

    <VenueChecks />

    <section
      class="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block text-sm font-medium">
          Project name
          <input
            data-testid="project-name"
            class="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base font-normal text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus-visible:ring-teal-400"
            :value="store.document.project.name"
            @input="onProjectName"
          />
        </label>
        <label class="block text-sm font-medium">
          Venue name
          <input
            data-testid="venue-name"
            class="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base font-normal text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus-visible:ring-teal-400"
            :value="store.document.venue.name"
            @input="onVenueName"
          />
        </label>
      </div>

      <dl class="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
        <div
          v-for="item in stats"
          :key="item.label"
          class="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-950"
        >
          <dt class="text-xs uppercase tracking-wide text-zinc-500">{{ item.label }}</dt>
          <dd class="mt-1 font-medium">{{ item.value }}</dd>
        </div>
      </dl>
      <p class="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
        {{ counts.spawns }} spawn point{{ counts.spawns === 1 ? "" : "s" }}. Schema
        {{ store.document.schemaVersion }}, metres, +Y up.
      </p>

      <div class="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="new-venue"
          class="rounded-md bg-teal-800 px-3 py-2 text-sm font-medium text-white hover:bg-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:bg-teal-400 dark:text-zinc-950 dark:hover:bg-teal-300 dark:focus-visible:ring-teal-200"
          @click="requestNew"
        >
          New venue
        </button>
        <button
          type="button"
          data-testid="save-json"
          class="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:focus-visible:ring-teal-400"
          @click="save"
        >
          Save JSON
        </button>
        <button
          type="button"
          data-testid="export-menu"
          class="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:focus-visible:ring-teal-400"
          :aria-expanded="exportOpen"
          @click="exportOpen = !exportOpen"
        >
          Export
        </button>
        <button
          type="button"
          data-testid="open-json"
          class="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:focus-visible:ring-teal-400"
          @click="openPicker"
        >
          Open JSON
        </button>
        <input
          ref="fileInput"
          data-testid="file-input"
          class="sr-only"
          type="file"
          accept="application/json,.json"
          @change="onFile"
        />
      </div>
      <div
        v-if="exportOpen"
        data-testid="export-dialog"
        role="dialog"
        aria-label="Export venue"
        class="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
      >
        <button
          type="button"
          data-testid="export-json"
          class="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          @click="save"
        >
          JSON
        </button>
        <button
          type="button"
          data-testid="export-svg"
          class="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          @click="saveSvg"
        >
          SVG
        </button>
        <button
          type="button"
          data-testid="export-png"
          class="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          @click="savePng"
        >
          PNG
        </button>
        <button
          type="button"
          data-testid="export-pdf"
          class="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          @click="savePdf"
        >
          PDF
        </button>
        <button
          type="button"
          data-testid="export-glb"
          class="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          @click="saveGlb"
        >
          GLB
        </button>
        <p v-if="exportError" class="text-sm text-red-700 dark:text-red-300">{{ exportError }}</p>
      </div>

      <div
        v-if="store.issues.length > 0"
        class="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
        role="alert"
        data-testid="load-errors"
      >
        <p class="font-medium">This venue needs a correction.</p>
        <ul class="mt-1 list-disc pl-5">
          <li v-for="issue in store.issues" :key="issue">{{ issue }}</li>
        </ul>
      </div>
    </section>

    <section class="mt-6">
      <h2 class="text-sm font-medium text-zinc-500 dark:text-zinc-400">venue.json</h2>
      <pre
        data-testid="venue-json"
        class="mt-2 max-h-96 overflow-auto rounded-xl border border-zinc-200 bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-100 dark:border-zinc-800"
        >{{ preview }}</pre>
    </section>
  </main>
</template>
