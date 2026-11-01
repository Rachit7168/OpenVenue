import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import { routes } from "../router";
import { useAuthStore } from "../stores/auth";
import TopBar from "./TopBar.vue";

describe("TopBar", () => {
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

  it("shows sign in and sign up links when unauthenticated", () => {
    const wrapper = mount(TopBar, {
      global: { plugins: [router] },
    });

    expect(wrapper.find("[data-testid=nav-login]").exists()).toBe(true);
    expect(wrapper.find("[data-testid=nav-signup]").exists()).toBe(true);
    expect(wrapper.find("[data-testid=user-menu-button]").exists()).toBe(false);
  });

  it("shows user avatar menu when authenticated and allows sign out", async () => {
    const auth = useAuthStore();
    await auth.login({ email: "rachel@architect.com", password: "mypassword" });

    const wrapper = mount(TopBar, {
      global: { plugins: [router] },
    });

    expect(wrapper.find("[data-testid=nav-login]").exists()).toBe(false);
    expect(wrapper.find("[data-testid=user-menu-button]").exists()).toBe(true);
    expect(wrapper.find("[data-testid=user-menu-button]").text()).toContain("Rachel");

    // Open user menu
    await wrapper.get("[data-testid=user-menu-button]").trigger("click");
    expect(wrapper.find("[data-testid=user-dropdown]").exists()).toBe(true);

    // Sign out
    await wrapper.get("[data-testid=nav-sign-out]").trigger("click");
    await flushPromises();

    expect(auth.isAuthenticated).toBe(false);
    expect(wrapper.find("[data-testid=nav-login]").exists()).toBe(true);
  });

  it("toggles mobile menu drawer on mobile screens", async () => {
    const wrapper = mount(TopBar, {
      global: { plugins: [router] },
    });

    expect(wrapper.find("[data-testid=mobile-menu]").exists()).toBe(false);
    await wrapper.get("[data-testid=mobile-menu-toggle]").trigger("click");
    expect(wrapper.find("[data-testid=mobile-menu]").exists()).toBe(true);

    await wrapper.get("[data-testid=mobile-menu-toggle]").trigger("click");
    expect(wrapper.find("[data-testid=mobile-menu]").exists()).toBe(false);
  });
});
