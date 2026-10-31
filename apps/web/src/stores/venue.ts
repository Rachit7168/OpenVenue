import {
  createEmptyVenue,
  loadVenueJson,
  saveVenueJson,
  VenueValidationError,
  type VenueDocument,
} from "@openvenue/scene-schema";
import { defineStore } from "pinia";
import { ref } from "vue";

export const useVenueStore = defineStore("venue", () => {
  const document = ref<VenueDocument>(createEmptyVenue());
  const issues = ref<string[]>([]);
  const fileName = ref("venue.json");
  const status = ref("New empty venue");

  function touch() {
    document.value.project.metadata.updatedAt = new Date().toISOString();
  }

  function createNew() {
    document.value = createEmptyVenue();
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
      document.value = loadVenueJson(text);
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
    return saveVenueJson(document.value);
  }

  return {
    document,
    issues,
    fileName,
    status,
    createNew,
    renameProject,
    renameVenue,
    loadJson,
    toJson,
  };
});
