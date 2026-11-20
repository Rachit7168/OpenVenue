<script setup lang="ts">
import { MAX_VENUE_JSON_CHARS, saveVenueJson } from "@openvenue/scene-schema";
import { computed, nextTick, ref, watch } from "vue";
import { useRouter } from "vue-router";
import conferenceHall from "../../../../examples/conference-hall.venue.json?raw";
import exhibitionExpo from "../../../../examples/exhibition-expo.venue.json?raw";
import galaBanquet from "../../../../examples/gala-banquet.venue.json?raw";
import hackathonArena from "../../../../examples/hackathon-arena.venue.json?raw";
import theaterStage from "../../../../examples/theater-stage.venue.json?raw";
import FloorPlan from "../components/FloorPlan.vue";
import type { ProjectTemplate } from "../project-library";
import { useProjectLibrary } from "../stores/projects";

const library = useProjectLibrary();
const router = useRouter();
const wizardOpen = ref(false);
const templatesMenuOpen = ref(false);
const newProjectButton = ref<HTMLButtonElement | null>(null);
const dialog = ref<HTMLDialogElement | null>(null);
const nameInput = ref<HTMLInputElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const renamingId = ref("");
const renameValue = ref("");
const name = ref("Untitled venue");
const width = ref(20);
const depth = ref(12);
const ceilingHeight = ref(3);
const template = ref<ProjectTemplate>("empty");
const formError = ref("");

const sampleBlueprints = [
  {
    id: "conference-hall",
    name: "Conference Auditorium",
    raw: conferenceHall,
    desc: "24 × 18 m · Keynote stage, podium, 200 attendee chairs",
  },
  {
    id: "exhibition-expo",
    name: "Exhibition Trade Fair",
    raw: exhibitionExpo,
    desc: "30 × 20 m · 10 shell booths, demo counters, lounge",
  },
  {
    id: "gala-banquet",
    name: "Gala Banquet & Reception",
    raw: galaBanquet,
    desc: "22 × 16 m · 12 round banquet tables, 72 chairs, stage",
  },
  {
    id: "theater-stage",
    name: "Theater & Keynote Stage",
    raw: theaterStage,
    desc: "24 × 16 m · 10m raised proscenium stage, 140 chairs",
  },
  {
    id: "hackathon-arena",
    name: "Hackathon & Esports Arena",
    raw: hackathonArena,
    desc: "26 × 18 m · 8 team pod clusters, 48 chairs, pitch stage",
  },
];

watch(wizardOpen, (open) => {
  if (open) {
    void nextTick(() => nameInput.value?.focus());
    return;
  }
  newProjectButton.value?.focus();
});

function trapDialog(event: KeyboardEvent) {
  if (event.key !== "Tab" || !dialog.value) {
    return;
  }
  const items = [
    ...dialog.value.querySelectorAll<HTMLElement>("button, input, select, textarea"),
  ].filter((item) => !item.hasAttribute("disabled"));
  const first = items[0];
  const last = items.at(-1);
  if (!first || !last) {
    return;
  }
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

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
      updatedAt: formatUpdatedAt(document.project.metadata.updatedAt),
      size,
      document,
    };
  }),
);

function formatUpdatedAt(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    return "Unknown update time";
  }
  const calendar = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/.exec(value);
  if (!calendar) {
    return "Unknown update time";
  }
  const year = Number(calendar[1]);
  const month = Number(calendar[2]);
  const day = Number(calendar[3]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > (daysInMonth[month - 1] ?? 0)) {
    return "Unknown update time";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown update time";
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

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

function openBlueprint(raw: string) {
  try {
    const document = library.importText(raw);
    void router.push({ name: "project", params: { projectId: document.project.id } });
  } catch {
    // The store records the message.
  }
}

function openConferenceHall() {
  openBlueprint(conferenceHall);
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
  <main class="page-grid mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <header class="rise-in surface" style="border-radius: 1.15rem; padding: 1.25rem 1.35rem">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 class="section-title">Projects</h1>
          <p class="mt-1 text-sm" style="color: var(--ink-soft)">
            Venues stay in this browser. Nothing is uploaded.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            ref="newProjectButton"
            type="button"
            data-testid="new-project"
            class="btn btn-primary min-h-10 px-3"
            @click="wizardOpen = !wizardOpen"
          >
            New project
          </button>
          <button
            type="button"
            data-testid="import-project"
            class="btn btn-secondary min-h-10 px-3"
            @click="fileInput?.click()"
          >
            Import JSON
          </button>
          <button
            type="button"
            data-testid="conference-hall"
            class="btn btn-secondary min-h-10 px-3"
            @click="openConferenceHall"
          >
            Conference hall
          </button>
          <div class="relative inline-block text-left">
            <button
              type="button"
              data-testid="templates-menu-btn"
              class="btn btn-secondary min-h-10 px-3"
              @click="templatesMenuOpen = !templatesMenuOpen"
            >
              Blueprints ▾
            </button>
            <div
              v-if="templatesMenuOpen"
              class="absolute right-0 z-30 mt-1 w-64 origin-top-right border py-1"
              style="
                border-color: var(--line);
                border-radius: 0.85rem;
                background: var(--paper-raised);
                box-shadow: var(--shadow);
              "
            >
              <button
                v-for="bp in sampleBlueprints"
                :key="bp.id"
                type="button"
                :data-testid="`open-blueprint-${bp.id}`"
                class="block w-full px-4 py-2.5 text-left text-xs hover:opacity-90"
                @click="
                  templatesMenuOpen = false;
                  openBlueprint(bp.raw);
                "
              >
                <div class="font-semibold">{{ bp.name }}</div>
                <div class="text-[11px]" style="color: var(--ink-soft)">{{ bp.desc }}</div>
              </button>
            </div>
          </div>
          <input
            ref="fileInput"
            class="sr-only"
            type="file"
            accept="application/json,.json"
            @change="importFile"
          />
        </div>
      </div>
    </header>

    <div v-if="wizardOpen" class="fixed inset-0 z-20 bg-zinc-950/40" @click="wizardOpen = false" />
    <dialog
      v-if="wizardOpen"
      ref="dialog"
      open
      class="fixed left-1/2 top-1/2 z-30 w-[min(36rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-5 text-zinc-900 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
      aria-label="New project"
      aria-modal="true"
      @keydown.esc="wizardOpen = false"
      @keydown="trapDialog"
    >
      <form @submit.prevent="createProject">
        <h2 class="text-sm font-medium">New venue</h2>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <label class="block text-sm font-medium sm:col-span-2">
            Name
            <input
              ref="nameInput"
              v-model="name"
              data-testid="project-name"
              required
              maxlength="200"
              class="focus-ring mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-normal text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
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
              class="focus-ring mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-normal dark:border-zinc-700 dark:bg-zinc-950"
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
              class="focus-ring mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-normal dark:border-zinc-700 dark:bg-zinc-950"
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
              class="focus-ring mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-normal dark:border-zinc-700 dark:bg-zinc-950"
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
              class="focus-ring mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-normal dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="empty">Empty hall</option>
              <option value="rectangular-hall">Rectangular hall</option>
            </select>
          </label>
        </div>
        <p v-if="formError" class="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">
          {{ formError }}
        </p>
        <div class="mt-4 flex flex-wrap gap-2">
          <button
            type="submit"
            data-testid="create-project"
            class="focus-ring rounded-md bg-teal-800 px-3 py-2 text-sm font-medium text-white hover:bg-teal-900 dark:bg-teal-400 dark:text-zinc-950 dark:hover:bg-teal-300"
          >
            Create project
          </button>
          <button
            type="button"
            class="focus-ring rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            @click="wizardOpen = false"
          >
            Cancel
          </button>
        </div>
      </form>
    </dialog>

    <p v-if="library.error" class="editor-alert-error mt-5" role="alert">
      {{ library.error }}
      <button type="button" class="ml-3 underline" @click="library.error = ''">Dismiss</button>
    </p>

    <p
      v-if="!library.ready"
      class="mt-8 text-sm"
      style="color: var(--ink-soft)"
      data-testid="empty-projects"
    >
      Loading projects…
    </p>
    <div
      v-else-if="cards.length === 0"
      class="mt-8 surface p-8 text-center"
      style="border-radius: 1.15rem; border-style: dashed"
      data-testid="empty-projects"
    >
      <p class="font-display text-lg font-semibold">No projects yet.</p>
      <p class="mt-1 text-sm" style="color: var(--ink-soft)">
        Create a blank venue, or launch a furnished blueprint:
      </p>
      <div class="mt-6 grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-3">
        <button
          v-for="bp in sampleBlueprints"
          :key="bp.id"
          type="button"
          :data-testid="`empty-blueprint-${bp.id}`"
          class="project-tile p-4 text-left"
          @click="openBlueprint(bp.raw)"
        >
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-sm font-semibold">{{ bp.name }}</h3>
            <span class="text-xs" style="color: var(--accent)">Launch →</span>
          </div>
          <p class="mt-1 text-xs" style="color: var(--ink-soft)">{{ bp.desc }}</p>
        </button>
      </div>
    </div>

    <ul v-else class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="card in cards" :key="card.id" data-testid="project-card" class="project-tile">
        <div data-testid="project-thumbnail" class="h-44 overflow-hidden">
          <FloorPlan :document="card.document" :interactive="false" />
        </div>
        <div class="flex flex-1 flex-col p-4">
          <h2 class="font-display text-base font-semibold">{{ card.name }}</h2>
          <p class="mt-1 text-xs" style="color: var(--ink-soft)">
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
              class="field min-w-0 flex-1"
            />
            <button type="submit" class="btn btn-secondary min-h-10 px-3 text-xs">Save</button>
          </form>
          <div class="mt-auto flex flex-wrap gap-2 pt-4 text-sm">
            <button
              type="button"
              data-testid="project-open"
              class="btn btn-primary min-h-9 px-3 text-xs"
              @click="router.push({ name: 'project', params: { projectId: card.id } })"
            >
              Open
            </button>
            <button
              type="button"
              class="btn btn-secondary min-h-9 px-3 text-xs"
              @click="startRename(card.id, card.name)"
            >
              Rename
            </button>
            <button
              type="button"
              data-testid="project-duplicate"
              class="btn btn-secondary min-h-9 px-3 text-xs"
              @click="duplicate(card.id)"
            >
              Duplicate
            </button>
            <button
              type="button"
              class="btn btn-secondary min-h-9 px-3 text-xs"
              @click="exportProject(card.id, card.name)"
            >
              Export
            </button>
            <button
              type="button"
              data-testid="project-delete"
              class="btn btn-ghost min-h-9 px-2 text-xs"
              style="color: var(--danger)"
              @click="remove(card.id, card.name)"
            >
              Delete
            </button>
          </div>
        </div>
      </li>
    </ul>
  </main>
</template>
