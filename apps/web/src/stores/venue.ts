import {
  createEmptyVenue,
  loadVenueJson,
  saveVenueJson,
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

  function createNew() {
    scene.replaceDocument(createEmptyVenue());
    issues.value = [];
    fileName.value = "venue.json";
    status.value = "New empty venue";
  }

  function renameProject(name: string) {
    document.value.project.name = name;
    touch();
    status.value = "Unsaved changes";
  }

  function renameVenue(name: string) {
    document.value.venue.name = name;
    touch();
    status.value = "Unsaved changes";
  }

  function loadJson(text: string, name = "venue.json") {
    try {
      scene.replaceDocument(loadVenueJson(text));
      issues.value = [];
      fileName.value = name;
      status.value = `Loaded ${name}`;
    } catch (error) {
      issues.value =
        error instanceof VenueValidationError ? error.issues : ["Could not load that file."];
      status.value = "Load failed. The current venue was kept.";
    }
  }

  function toJson() {
    touch();
    return saveVenueJson(scene.getDocument());
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
    toJson,
    undo,
    redo,
  };
});
