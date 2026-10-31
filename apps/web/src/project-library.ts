import { planRectangularRoom } from "@openvenue/editor-core";
import {
  createEmptyVenue,
  loadVenueJson,
  saveVenueJson,
  validateVenue,
  type VenueDocument,
} from "@openvenue/scene-schema";

export const PROJECTS_KEY = "openvenue-projects";
const MAX_DIMENSION = 1_000;

export type ProjectTemplate = "empty" | "rectangular-hall";

export interface NewProjectInput {
  name: string;
  width: number;
  depth: number;
  ceilingHeight: number;
  template: ProjectTemplate;
}

export interface ProjectStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function assertDimension(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0 || value > MAX_DIMENSION) {
    throw new Error(`${label} must be greater than 0 and at most ${MAX_DIMENSION} metres`);
  }
}

function copiedName(name: string): string {
  const suffix = " copy";
  return `${name.slice(0, 200 - suffix.length)}${suffix}`;
}

/** Empty venue, or one rectangular hall, with the wizard dimensions stored on the project. */
export function createProjectDocument(input: NewProjectInput, now = new Date()): VenueDocument {
  const name = input.name.trim();
  if (name.length < 1 || name.length > 200) {
    throw new Error("Name must be between 1 and 200 characters");
  }
  assertDimension(input.width, "Width");
  assertDimension(input.depth, "Depth");
  assertDimension(input.ceilingHeight, "Ceiling height");

  const document = createEmptyVenue(name, now);
  const floor = document.venue.floors[0];
  if (!floor) {
    throw new Error("A new venue needs a ground floor");
  }
  floor.height = input.ceilingHeight;
  document.project.metadata.planWidth = input.width;
  document.project.metadata.planDepth = input.depth;

  if (input.template === "rectangular-hall") {
    const planned = planRectangularRoom({
      name: "Hall",
      width: input.width,
      depth: input.depth,
      height: input.ceilingHeight,
      roomId: crypto.randomUUID(),
      wallIds: [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()],
    });
    floor.walls.push(...planned.walls);
    floor.rooms.push(planned.room);
  }

  const result = validateVenue(document);
  if (!result.valid) {
    throw new Error(result.issues.join("\n"));
  }
  return result.document;
}

function instant(timestamp: string): number {
  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function readProjects(storage: ProjectStorage): VenueDocument[] {
  const raw = storage.getItem(PROJECTS_KEY);
  if (!raw) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  const projects: VenueDocument[] = [];
  for (const item of parsed) {
    const result = validateVenue(item);
    if (result.valid) {
      projects.push(result.document);
    }
  }
  return projects.sort(
    (a, b) => instant(b.project.metadata.updatedAt) - instant(a.project.metadata.updatedAt),
  );
}

export function writeProjects(storage: ProjectStorage, projects: readonly VenueDocument[]): void {
  storage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function upsertProject(
  projects: readonly VenueDocument[],
  document: VenueDocument,
): VenueDocument[] {
  return [document, ...projects.filter((item) => item.project.id !== document.project.id)];
}

export function removeProject(projects: readonly VenueDocument[], id: string): VenueDocument[] {
  return projects.filter((item) => item.project.id !== id);
}

export function duplicateProject(document: VenueDocument, now = new Date()): VenueDocument {
  const copy = createEmptyVenue(document.project.name, now);
  const source = JSON.parse(JSON.stringify(document)) as VenueDocument;
  source.project.id = copy.project.id;
  source.project.name = copiedName(document.project.name);
  source.project.metadata.createdAt = copy.project.metadata.createdAt;
  source.project.metadata.updatedAt = copy.project.metadata.updatedAt;
  const result = validateVenue(source);
  if (!result.valid) {
    throw new Error(result.issues.join("\n"));
  }
  return result.document;
}

export function renameStoredProject(
  document: VenueDocument,
  name: string,
  now = new Date(),
): VenueDocument {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 200) {
    throw new Error("Name must be between 1 and 200 characters");
  }
  const next = JSON.parse(JSON.stringify(document)) as VenueDocument;
  next.project.name = trimmed;
  next.project.metadata.updatedAt = now.toISOString();
  return next;
}

export function importProject(text: string): VenueDocument {
  return loadVenueJson(text);
}

export function exportProject(document: VenueDocument): string {
  return saveVenueJson(document);
}
