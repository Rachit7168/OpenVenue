<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import FloorPlan from "../components/FloorPlan.vue";
import { useProjectLibrary } from "../stores/projects";
import { useVenueStore } from "../stores/venue";

const store = useVenueStore();
const library = useProjectLibrary();
const route = useRoute();
const router = useRouter();
const fileInput = ref<HTMLInputElement | null>(null);

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

function save() {
  const json = store.toJson();
  if (!json) {
    return;
  }
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = store.fileName.endsWith(".json") ? store.fileName : "venue.json";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  store.markSaved(link.download);
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
          Drag the plan to pan and scroll to zoom. Lengths are metres, with +Z up the screen.
        </p>
      </div>
      <p class="text-sm text-zinc-500 dark:text-zinc-400" aria-live="polite">{{ store.status }}</p>
    </div>

    <section class="mt-6 h-[32rem] overflow-hidden rounded-xl border border-zinc-800 shadow-sm">
      <FloorPlan :document="store.document" />
    </section>

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
