import {
  createEmptyVenue,
  loadVenueJson,
  MAX_VENUE_JSON_CHARS,
  saveVenueJson,
  validateVenue,
  VenueValidationError,
  type VenueDocument,
} from "@openvenue/scene-schema";
import { SceneStore } from "@openvenue/scene-engine";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

export const useVenueStore = defineStore("venue", () => {
  const scene = new SceneStore(createEmptyVenue());
  const document = ref<VenueDocument>(scene.getDocument());
  const selection = ref<string[]>([...scene.getSelection().ids]);
  const revision = ref(0);
  const issues = ref<string[]>([]);
  const fileName = ref("venue.json");
  const status = ref("New empty venue");
  const loadToken = ref(0);

  scene.subscribe((change) => {
    revision.value += 1;
    if (change.kind === "document") {
      document.value = change.document;
    }
    if (change.kind === "selection") {
      selection.value = [...change.selection.ids];
    }
  });

  const canUndo = computed(() => {
    void revision.value;
    return scene.canUndo;
  });
  const canRedo = computed(() => {
    void revision.value;
    return scene.canRedo;
  });

  function touch() {
    document.value.project.metadata.updatedAt = new Date().toISOString();
  }

  function syncDocument() {
    scene.updateDocument(document.value);
  }

  function invalidateLoads() {
    loadToken.value += 1;
  }

  function startLoad() {
    invalidateLoads();
    return loadToken.value;
  }

  function isCurrentLoad(token: number | undefined) {
    return token === undefined || token === loadToken.value;
  }

  function applyName(current: string, next: string, assign: (name: string) => void) {
    invalidateLoads();
    if (next.length < 1 || next.length > 200) {
      issues.value = ["Name must be between 1 and 200 characters."];
      status.value = "Name was not changed.";
      return;
    }
    if (next === current) {
      return;
    }
    assign(next);
    touch();
    syncDocument();
    issues.value = [];
    status.value = "Unsaved changes";
  }

  function createNew() {
    invalidateLoads();
    scene.replaceDocument(createEmptyVenue());
    issues.value = [];
    fileName.value = "venue.json";
    status.value = "New empty venue";
  }

  function renameProject(name: string) {
    applyName(document.value.project.name, name, (next) => {
      document.value.project.name = next;
    });
  }

  function renameVenue(name: string) {
    applyName(document.value.venue.name, name, (next) => {
      document.value.venue.name = next;
    });
  }

  function loadJson(text: string, name = "venue.json", token?: number) {
    if (!isCurrentLoad(token)) {
      return;
    }
    try {
      scene.replaceDocument(loadVenueJson(text));
      issues.value = [];
      fileName.value = name;
      status.value = `Loaded ${name}`;
    } catch (error) {
      if (!isCurrentLoad(token)) {
        return;
      }
      issues.value =
        error instanceof VenueValidationError ? error.issues : ["Could not load that file."];
      status.value = "Load failed. The current venue was kept.";
    }
  }

  function reportLoadFailure(message: string, token?: number) {
    if (!isCurrentLoad(token)) {
      return;
    }
    issues.value = [message];
    status.value = "Load failed. The current venue was kept.";
  }

  function toJson(): string | null {
    touch();
    syncDocument();
    const result = validateVenue(scene.getDocument());
    if (!result.valid) {
      issues.value = result.issues;
      status.value = "This venue is not valid, so it was not saved.";
      return null;
    }
    issues.value = [];
    return saveVenueJson(result.document);
  }

  function markSaved(name: string) {
    status.value = `Saved ${name}`;
  }

  function undo() {
    scene.undo();
    status.value = scene.canRedo ? "Undone" : status.value;
  }

  function redo() {
    scene.redo();
    status.value = "Redone";
  }

  return {
    document,
    selection,
    issues,
    fileName,
    status,
    canUndo,
    canRedo,
    createNew,
    renameProject,
    renameVenue,
    loadJson,
    reportLoadFailure,
    startLoad,
    toJson,
    markSaved,
    maxFileChars: MAX_VENUE_JSON_CHARS,
    undo,
    redo,
  };
});
