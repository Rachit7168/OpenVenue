<script setup lang="ts">
import { MAX_VENUE_JSON_CHARS, saveVenueJson } from "@openvenue/scene-schema";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import conferenceHall from "../../../../examples/conference-hall.venue.json?raw";
import FloorPlan from "../components/FloorPlan.vue";
import type { ProjectTemplate } from "../project-library";
import { useProjectLibrary } from "../stores/projects";

const library = useProjectLibrary();
const router = useRouter();
const wizardOpen = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const renamingId = ref("");
const renameValue = ref("");
const name = ref("Untitled venue");
const width = ref(20);
const depth = ref(12);
const ceilingHeight = ref(3);
const template = ref<ProjectTemplate>("empty");
const formError = ref("");

const cards = computed(() =>
  library.projects.map((document) => {
    const widthValue = document.project.metadata.planWidth;
    const depthValue = document.project.metadata.planDepth;
    const size =
      typeof widthValue === "number" && typeof depthValue === "number"
        ? `${widthValue} × ${depthValue} m`
        : "Metres";
    return {
      id: document.project.id,
      name: document.project.name,
      updatedAt: document.project.metadata.updatedAt,
      size,
      document,
    };
  }),
);

function createProject() {
  formError.value = "";
  try {
    const document = library.create({
      name: name.value,
      width: width.value,
      depth: depth.value,
      ceilingHeight: ceilingHeight.value,
      template: template.value,
    });
    void router.push({ name: "project", params: { projectId: document.project.id } });
  } catch (error) {
    formError.value = error instanceof Error ? error.message : "Could not create that project.";
  }
}

function startRename(id: string, current: string) {
  renamingId.value = id;
  renameValue.value = current;
}

function commitRename(id: string) {
  try {
    library.rename(id, renameValue.value);
    renamingId.value = "";
  } catch (error) {
    library.error = error instanceof Error ? error.message : "Could not rename that project.";
  }
}

function remove(id: string, projectName: string) {
  if (!window.confirm(`Delete “${projectName}”? This only removes it from this browser.`)) {
    return;
  }
  library.remove(id);
}

function duplicate(id: string) {
  library.duplicate(id);
}

function exportProject(id: string, projectName: string) {
  const venue = library.find(id);
  if (!venue) {
    return;
  }
  const json = saveVenueJson(venue);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = globalThis.document.createElement("a");
  link.href = url;
  link.download = `${projectName.replaceAll(/[^\w.-]+/g, "-") || "venue"}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function openConferenceHall() {
  try {
    const document = library.importText(conferenceHall);
    void router.push({ name: "project", params: { projectId: document.project.id } });
  } catch {
    // The store records the message.
  }
}

function importFile(event: Event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) {
    return;
  }
  const file = input.files?.[0];
  input.value = "";
  if (!file) {
    return;
  }
  if (file.size > MAX_VENUE_JSON_CHARS) {
    library.error = `File is larger than ${MAX_VENUE_JSON_CHARS} characters.`;
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") {
      try {
        library.importText(reader.result);
      } catch {
        // The store records the message.
      }
    }
  };
  reader.onerror = () => {
    library.error = "Could not read that file.";
  };
  reader.readAsText(file);
}
</script>

<template>
  <main class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Projects</h1>
        <p class="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Venues stay in this browser. Nothing is uploaded.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="new-project"
          class="rounded-md bg-teal-800 px-3 py-2 text-sm font-medium text-white hover:bg-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:bg-teal-400 dark:text-zinc-950 dark:hover:bg-teal-300 dark:focus-visible:ring-teal-200"
          @click="wizardOpen = !wizardOpen"
        >
          New project
        </button>
        <button
          type="button"
          data-testid="import-project"
          class="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:focus-visible:ring-teal-400"
          @click="fileInput?.click()"
        >
          Import JSON
        </button>
        <button
          type="button"
          data-testid="conference-hall"
          class="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:focus-visible:ring-teal-400"
          @click="openConferenceHall"
        >
          Conference hall
        </button>
        <input
          ref="fileInput"
          class="sr-only"
          type="file"
          accept="application/json,.json"
          @change="importFile"
        />
      </div>
    </div>

    <div v-if="wizardOpen" class="fixed inset-0 z-20 bg-zinc-950/40" @click="wizardOpen = false" />
    <dialog
      v-if="wizardOpen"
      open
      class="fixed left-1/2 top-1/2 z-30 w-[min(36rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-5 text-zinc-900 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
      aria-label="New project"
      @keydown.esc="wizardOpen = false"
    >
      <form @submit.prevent="createProject">
        <h2 class="text-sm font-medium">New venue</h2>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <label class="block text-sm font-medium sm:col-span-2">
            Name
            <input
              v-model="name"
              data-testid="project-name"
              required
              maxlength="200"
              class="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-normal text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
          <label class="block text-sm font-medium">
            Width (m)
            <input
              v-model.number="width"
              data-testid="project-width"
              type="number"
              min="0.1"
              max="1000"
              step="0.1"
              required
              class="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-normal dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          <label class="block text-sm font-medium">
            Depth (m)
            <input
              v-model.number="depth"
              data-testid="project-depth"
              type="number"
              min="0.1"
              max="1000"
              step="0.1"
              required
              class="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-normal dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          <label class="block text-sm font-medium">
            Ceiling height (m)
            <input
              v-model.number="ceilingHeight"
              data-testid="project-height"
              type="number"
              min="0.1"
              max="1000"
              step="0.1"
              required
              class="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-normal dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          <label class="block text-sm font-medium">
            Units
            <input
              value="Metres"
              readonly
              class="mt-1 w-full rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 font-normal text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300"
            />
          </label>
          <label class="block text-sm font-medium sm:col-span-2">
            Template
            <select
              v-model="template"
              data-testid="project-template"
              class="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-normal dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="empty">Empty hall</option>
              <option value="rectangular-hall">Rectangular hall</option>
            </select>
          </label>
        </div>
        <p v-if="formError" class="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">
          {{ formError }}
        </p>
        <button
          type="submit"
          data-testid="create-project"
          class="mt-4 rounded-md bg-teal-800 px-3 py-2 text-sm font-medium text-white hover:bg-teal-900 dark:bg-teal-400 dark:text-zinc-950 dark:hover:bg-teal-300"
        >
          Create project
        </button>
      </form>
    </dialog>

    <p
      v-if="library.error"
      class="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
      role="alert"
    >
      {{ library.error }}
    </p>

    <p
      v-if="!library.ready"
      class="mt-8 text-sm text-zinc-500 dark:text-zinc-400"
      data-testid="empty-projects"
    >
      Loading projects…
    </p>
    <p
      v-else-if="cards.length === 0"
      class="mt-8 rounded-xl border border-dashed border-zinc-300 px-5 py-10 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
      data-testid="empty-projects"
    >
      No projects yet.
    </p>

    <ul v-else class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <li
        v-for="card in cards"
        :key="card.id"
        data-testid="project-card"
        class="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div data-testid="project-thumbnail" class="h-40 overflow-hidden rounded-md">
          <FloorPlan :document="card.document" :interactive="false" />
        </div>
        <h2 class="mt-3 font-medium">{{ card.name }}</h2>
        <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {{ card.size }} · {{ card.updatedAt }}
        </p>
        <form
          v-if="renamingId === card.id"
          class="mt-3 flex gap-2"
          @submit.prevent="commitRename(card.id)"
        >
          <input
            v-model="renameValue"
            data-testid="rename-input"
            maxlength="200"
            class="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <button type="submit" class="text-sm font-medium text-teal-800 dark:text-teal-300">
            Save
          </button>
        </form>
        <div class="mt-3 flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            data-testid="project-open"
            class="font-medium text-teal-800 hover:underline dark:text-teal-300"
            @click="router.push({ name: 'project', params: { projectId: card.id } })"
          >
            Open
          </button>
          <button type="button" class="hover:underline" @click="startRename(card.id, card.name)">
            Rename
          </button>
          <button
            type="button"
            data-testid="project-duplicate"
            class="hover:underline"
            @click="duplicate(card.id)"
          >
            Duplicate
          </button>
          <button type="button" class="hover:underline" @click="exportProject(card.id, card.name)">
            Export
          </button>
          <button
            type="button"
            data-testid="project-delete"
            class="text-red-700 hover:underline dark:text-red-300"
            @click="remove(card.id, card.name)"
          >
            Delete
          </button>
        </div>
      </li>
    </ul>
  </main>
</template>
