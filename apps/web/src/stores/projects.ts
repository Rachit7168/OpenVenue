import { loadVenueJson, VenueValidationError, type VenueDocument } from "@openvenue/scene-schema";
import { defineStore } from "pinia";
import { ref } from "vue";
import {
  createProjectDocument,
  duplicateProject,
  readProjects,
  removeProject,
  renameStoredProject,
  upsertProject,
  writeProjects,
  type NewProjectInput,
} from "../project-library";
import {
  newerDocument,
  openVenueDatabase,
  SAVE_DELAY_MS,
  type VenueDatabase,
} from "../persistence";

export const useProjectLibrary = defineStore("projects", () => {
  const projects = ref<VenueDocument[]>(readProjects(localStorage));
  const error = ref("");
  const ready = ref(true);
  const saveState = ref("");
  let database: VenueDatabase | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: VenueDocument[] | null = null;
  let epoch = 0;

  async function db(): Promise<VenueDatabase> {
    database ??= await openVenueDatabase();
    return database;
  }

  async function hydrate() {
    const epochAtStart = epoch;
    try {
      const store = await db();
      const stored = await store.list();
      if (epoch !== epochAtStart) {
        return;
      }
      if (stored.length === 0) {
        for (const item of projects.value) {
          await store.put(item);
        }
        return;
      }
      const byId = new Map(projects.value.map((item) => [item.project.id, item]));
      let restored = false;
      for (const item of stored) {
        const snapshot = newerDocument(item, await store.latestSnapshot(item.project.id));
        const local = byId.get(item.project.id);
        const chosen = local ? newerDocument(local, snapshot) : snapshot;
        if (chosen !== local) {
          restored = true;
        }
        byId.set(item.project.id, chosen);
        if (chosen !== item) {
          await store.put(chosen);
        }
      }
      if (epoch === epochAtStart) {
        projects.value = [...byId.values()];
        saveState.value = restored ? "restored" : saveState.value;
      }
    } catch {
      projects.value = readProjects(localStorage);
      error.value = "Could not open the saved venues. Showing the browser copy.";
    } finally {
      ready.value = true;
    }
  }

  void hydrate();

  function remember(next: VenueDocument[]) {
    projects.value = next;
    try {
      writeProjects(localStorage, next);
    } catch {
      error.value = "The browser copy is full. The venue database still has the save.";
    }
  }

  function queue(next: VenueDocument[], immediate = false) {
    epoch += 1;
    remember(next);
    pending = next;
    saveState.value = "pending";
    if (timer) {
      clearTimeout(timer);
    }
    if (immediate) {
      void flush();
      return;
    }
    timer = setTimeout(() => {
      void flush();
    }, SAVE_DELAY_MS);
  }

  async function flush() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    const batch = pending;
    pending = null;
    if (!batch) {
      return;
    }
    saveState.value = "saving";
    try {
      const store = await db();
      const ids = new Set(batch.map((item) => item.project.id));
      for (const existing of await store.list()) {
        if (!ids.has(existing.project.id)) {
          await store.remove(existing.project.id);
        }
      }
      for (const item of batch) {
        await store.put(item);
        await store.addSnapshot(item);
      }
      saveState.value = "saved";
    } catch {
      saveState.value = "error";
      error.value = "Could not save projects in this browser.";
    }
  }

  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", () => {
      void flush();
    });
  }

  function create(input: NewProjectInput): VenueDocument {
    const document = createProjectDocument(input);
    queue(upsertProject(projects.value, document), true);
    error.value = "";
    return document;
  }

  function save(document: VenueDocument): void {
    try {
      queue(upsertProject(projects.value, document));
      error.value = "";
    } catch {
      error.value = "Could not save projects in this browser.";
    }
  }

  function duplicate(id: string): VenueDocument | null {
    const found = projects.value.find((item) => item.project.id === id);
    if (!found) {
      return null;
    }
    const copy = duplicateProject(found);
    queue(upsertProject(projects.value, copy), true);
    error.value = "";
    return copy;
  }

  function rename(id: string, name: string): void {
    const found = projects.value.find((item) => item.project.id === id);
    if (!found) {
      return;
    }
    queue(upsertProject(projects.value, renameStoredProject(found, name)), true);
    error.value = "";
  }

  function remove(id: string): void {
    queue(removeProject(projects.value, id), true);
    error.value = "";
  }

  function importText(text: string): VenueDocument {
    try {
      const document = loadVenueJson(text);
      queue(upsertProject(projects.value, document), true);
      error.value = "";
      return document;
    } catch (caught) {
      const message =
        caught instanceof VenueValidationError
          ? caught.issues.join(" ")
          : "Could not import that file.";
      error.value = message;
      throw caught;
    }
  }

  function find(id: string): VenueDocument | null {
    return projects.value.find((item) => item.project.id === id) ?? null;
  }

  return {
    projects,
    error,
    ready,
    saveState,
    create,
    save,
    duplicate,
    rename,
    remove,
    importText,
    find,
    flush,
  };
});
