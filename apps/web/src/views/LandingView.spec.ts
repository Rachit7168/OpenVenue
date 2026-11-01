import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import { routes } from "../router";
import LandingView from "./LandingView.vue";

describe("LandingView", () => {
  let router: ReturnType<typeof createRouter>;

  beforeEach(async () => {
    setActivePinia(createPinia());
    localStorage.clear();
    router = createRouter({
      history: createMemoryHistory(),
      routes,
    });
    await router.push("/");
    await router.isReady();
  });

  it("renders headline, call to actions, and feature ribbon", () => {
    const wrapper = mount(LandingView, {
      global: { plugins: [router] },
    });

    expect(wrapper.text()).toContain("Architectural Precision");
    expect(wrapper.text()).toContain("Instant 3D");
    expect(wrapper.find("[data-testid=open-editor]").exists()).toBe(true);
    expect(wrapper.find("[data-testid=hero-demo-button]").exists()).toBe(true);
    expect(wrapper.text()).toContain("60 FPS Three.js Engine");
  });

  it("toggles showcase tabs", async () => {
    const wrapper = mount(LandingView, {
      global: { plugins: [router] },
    });

    expect(wrapper.text()).toContain("2D Vector Editor: Sub-centimeter Snapping");
    const buttons = wrapper.findAll("button");
    const walkButton = buttons.find((b) => b.text().includes("WASD Walk"));
    expect(walkButton).toBeDefined();

    await walkButton?.trigger("click");
    expect(wrapper.text()).toContain("First-Person Walk: WASD Physical Collision");
  });

  it("toggles FAQ accordion items", async () => {
    const wrapper = mount(LandingView, {
      global: { plugins: [router] },
    });

    expect(wrapper.text()).toContain(
      "Do I need an account or internet connection to use OpenVenue?",
    );
    expect(wrapper.text()).toContain("100% local-first");

    const secondFaqButton = wrapper
      .findAll("button")
      .find((b) => b.text().includes("What format does OpenVenue save"));
    expect(secondFaqButton).toBeDefined();

    await secondFaqButton?.trigger("click");
    expect(wrapper.text()).toContain("venue.json conforming to the draft 2020-12");
  });

  it("launches the conference hall demo directly into the project workspace", async () => {
    const wrapper = mount(LandingView, {
      global: { plugins: [router] },
    });

    await wrapper.get("[data-testid=hero-demo-button]").trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("project");
  });
});
