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

export const useProjectLibrary = defineStore("projects", () => {
  const projects = ref<VenueDocument[]>(readProjects(localStorage));
  const error = ref("");

  function persist(next: VenueDocument[]) {
    writeProjects(localStorage, next);
    projects.value = readProjects(localStorage);
  }

  function create(input: NewProjectInput): VenueDocument {
    const document = createProjectDocument(input);
    persist(upsertProject(projects.value, document));
    error.value = "";
    return document;
  }

  function save(document: VenueDocument): void {
    try {
      persist(upsertProject(projects.value, document));
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
    persist(upsertProject(projects.value, copy));
    error.value = "";
    return copy;
  }

  function rename(id: string, name: string): void {
    const found = projects.value.find((item) => item.project.id === id);
    if (!found) {
      return;
    }
    persist(upsertProject(projects.value, renameStoredProject(found, name)));
    error.value = "";
  }

  function remove(id: string): void {
    persist(removeProject(projects.value, id));
    error.value = "";
  }

  function importText(text: string): VenueDocument {
    try {
      const document = loadVenueJson(text);
      persist(upsertProject(projects.value, document));
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

  return { projects, error, create, save, duplicate, rename, remove, importText, find };
});
