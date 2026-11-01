import { flushPromises, mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import { deleteVenueDatabase } from "../persistence";
import { createProjectDocument } from "../project-library";
import { useProjectLibrary } from "../stores/projects";
import ProjectsView from "./ProjectsView.vue";

describe("project card dates", () => {
  beforeEach(async () => {
    localStorage.clear();
    await deleteVenueDatabase();
  });

  async function openCard(updatedAt: string) {
    const pinia = createPinia();
    const library = useProjectLibrary(pinia);
    await flushPromises();
    const document = createProjectDocument({
      name: "Meeting hall",
      width: 20,
      depth: 12,
      ceilingHeight: 3,
      template: "empty",
    });
    document.project.metadata.updatedAt = updatedAt;
    library.projects = [document];
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/", component: ProjectsView }],
    });
    await router.push("/");
    await router.isReady();
    return mount(ProjectsView, {
      global: { plugins: [pinia, router], stubs: { FloorPlan: true } },
    });
  }

  it("shows local date and time while preserving the project name and size", async () => {
    const timestamp = "2026-11-01T18:48:24Z";
    const wrapper = await openCard(timestamp);
    try {
      const card = wrapper.get("[data-testid=project-card]");
      const expected = new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(timestamp));
      expect(card.get("h2").text()).toBe("Meeting hall");
      expect(card.get("p").text()).toBe(`20 × 12 m · ${expected}`);
      expect(card.text()).not.toContain(timestamp);
    } finally {
      wrapper.unmount();
    }
  });

  it.each(["", "not-a-date"])(
    "renders a fallback for an unusable update time: %s",
    async (value) => {
      const wrapper = await openCard(value);
      try {
        expect(wrapper.get("[data-testid=project-card] p").text()).toBe(
          "20 × 12 m · Unknown update time",
        );
      } finally {
        wrapper.unmount();
      }
    },
  );
});
