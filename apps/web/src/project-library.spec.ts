import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createProjectDocument,
  duplicateProject,
  PROJECTS_KEY,
  readProjects,
  removeProject,
  renameStoredProject,
  upsertProject,
  writeProjects,
  type ProjectStorage,
} from "./project-library";
import { useProjectLibrary } from "./stores/projects";

function memory(): ProjectStorage & { raw(): string | null } {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    raw: () => values.get(PROJECTS_KEY) ?? null,
  };
}

describe("project library", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("creates an empty hall and a rectangular hall", () => {
    const empty = createProjectDocument({
      name: "Atrium",
      width: 20,
      depth: 12,
      ceilingHeight: 4,
      template: "empty",
    });
    expect(empty.project.name).toBe("Atrium");
    expect(empty.venue.floors[0]?.height).toBe(4);
    expect(empty.venue.floors[0]?.rooms).toHaveLength(0);
    expect(empty.project.metadata.planWidth).toBe(20);

    const hall = createProjectDocument({
      name: "Hall",
      width: 10,
      depth: 8,
      ceilingHeight: 3,
      template: "rectangular-hall",
    });
    expect(hall.venue.floors[0]?.walls).toHaveLength(4);
    expect(hall.venue.floors[0]?.rooms).toHaveLength(1);
    const boundary = hall.venue.floors[0]?.rooms[0]?.boundary ?? [];
    const xs = boundary.map((point) => point.x);
    const zs = boundary.map((point) => point.z);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(10);
    expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(8);
    expect(hall.project.metadata.planWidth).toBe(10);
    expect(hall.project.metadata.planDepth).toBe(8);
    expect(() =>
      createProjectDocument({
        name: " ",
        width: 10,
        depth: 8,
        ceilingHeight: 3,
        template: "empty",
      }),
    ).toThrow(/1 and 200/);
  });

  it("stores projects and ignores a corrupt list", () => {
    const storage = memory();
    const created = createProjectDocument({
      name: "Atrium",
      width: 20,
      depth: 12,
      ceilingHeight: 4,
      template: "empty",
    });
    writeProjects(storage, upsertProject([], created));
    expect(readProjects(storage)).toHaveLength(1);

    const earlier = createProjectDocument({
      name: "Earlier",
      width: 10,
      depth: 8,
      ceilingHeight: 3,
      template: "empty",
    });
    const later = createProjectDocument({
      name: "Later",
      width: 10,
      depth: 8,
      ceilingHeight: 3,
      template: "empty",
    });
    earlier.project.metadata.updatedAt = "2026-10-31T12:00:00+05:30";
    later.project.metadata.updatedAt = "2026-10-31T07:00:00Z";
    writeProjects(storage, [earlier, later]);
    expect(readProjects(storage).map((item) => item.project.name)).toEqual(["Later", "Earlier"]);

    const copy = duplicateProject(created);
    expect(copy.project.id).not.toBe(created.project.id);
    expect(copy.project.name).toBe("Atrium copy");
    expect(renameStoredProject(copy, "West hall").project.name).toBe("West hall");
    expect(removeProject([created, copy], created.project.id)).toEqual([copy]);

    storage.setItem(PROJECTS_KEY, "{");
    expect(readProjects(storage)).toEqual([]);
  });

  it("lists a project again after the store is created from storage", () => {
    setActivePinia(createPinia());
    const created = useProjectLibrary().create({
      name: "Atrium",
      width: 18,
      depth: 10,
      ceilingHeight: 3.5,
      template: "empty",
    });

    setActivePinia(createPinia());
    const reloaded = useProjectLibrary();
    expect(reloaded.projects.map((item) => item.project.id)).toEqual([created.project.id]);
    expect(reloaded.projects[0]?.project.name).toBe("Atrium");
  });
});
