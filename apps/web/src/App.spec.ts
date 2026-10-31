import { flushPromises, mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import App from "./App.vue";
import WorkspaceView from "./views/WorkspaceView.vue";

describe("app shell", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("shows the workspace and toggles color mode", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/", component: WorkspaceView }],
    });
    const wrapper = mount(App, {
      global: { plugins: [createPinia(), router] },
    });
    await router.isReady();
    await flushPromises();

    expect(wrapper.text()).toContain("OpenVenue");
    expect(wrapper.get("[data-testid=venue-json]").text()).toContain("Untitled venue");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    await wrapper.get("[data-testid=theme-toggle]").trigger("click");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("openvenue-theme")).toBe("light");
    expect(wrapper.get("[data-testid=theme-toggle]").text()).toBe("Dark");
  });
});
