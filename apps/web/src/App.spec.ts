import { flushPromises, mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import App from "./App.vue";
import { routes } from "./router";

function mountApp() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes,
  });
  const wrapper = mount(App, {
    global: { plugins: [createPinia(), router] },
  });
  return { wrapper, router };
}

describe("app shell", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("lists a new project after reload and toggles color mode", async () => {
    const first = mountApp();
    await first.router.isReady();
    await flushPromises();

    expect(first.wrapper.text()).toContain("No projects yet");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    await first.wrapper.get("[data-testid=theme-toggle]").trigger("click");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("openvenue-theme")).toBe("light");

    await first.wrapper.get("[data-testid=new-project]").trigger("click");
    await first.wrapper.get("[data-testid=project-name]").setValue("Main hall");
    await first.wrapper.get("[data-testid=project-template]").setValue("rectangular-hall");
    await first.wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(first.wrapper.get("[data-testid=venue-json]").text()).toContain("Main hall");
    expect(first.wrapper.get("[data-testid=venue-json]").text()).toContain("Hall");
    expect(first.wrapper.find("[data-testid=floor-plan]").exists()).toBe(true);
    expect(first.wrapper.get("[data-testid=plan-status]").text()).toContain("metres");
    first.wrapper.unmount();

    const second = mountApp();
    await second.router.isReady();
    await flushPromises();
    expect(second.wrapper.get("[data-testid=project-card]").text()).toContain("Main hall");
    expect(
      second.wrapper.find("[data-testid=project-thumbnail] [data-testid=floor-plan]").exists(),
    ).toBe(true);
  });
});
