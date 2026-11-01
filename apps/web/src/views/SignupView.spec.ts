import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import { routes } from "../router";
import { useAuthStore } from "../stores/auth";
import SignupView from "./SignupView.vue";

describe("SignupView", () => {
  let router: ReturnType<typeof createRouter>;

  beforeEach(async () => {
    setActivePinia(createPinia());
    localStorage.clear();
    router = createRouter({
      history: createMemoryHistory(),
      routes,
    });
    await router.push("/signup");
    await router.isReady();
  });

  it("renders signup inputs and role selector", () => {
    const wrapper = mount(SignupView, {
      global: { plugins: [router] },
    });

    expect(wrapper.text()).toContain("Create your account");
    expect(wrapper.find("[data-testid=signup-name]").exists()).toBe(true);
    expect(wrapper.find("[data-testid=signup-email]").exists()).toBe(true);
    expect(wrapper.find("[data-testid=signup-role]").exists()).toBe(true);
    expect(wrapper.find("[data-testid=signup-password]").exists()).toBe(true);
    expect(wrapper.find("[data-testid=signup-confirm-password]").exists()).toBe(true);
    expect(wrapper.find("[data-testid=signup-submit]").exists()).toBe(true);
  });

  it("registers successfully and redirects to /projects", async () => {
    const auth = useAuthStore();
    const wrapper = mount(SignupView, {
      global: { plugins: [router] },
    });

    await wrapper.get("[data-testid=signup-name]").setValue("Morgan Drake");
    await wrapper.get("[data-testid=signup-email]").setValue("morgan@expo.com");
    await wrapper.get("[data-testid=signup-password]").setValue("strongSecret#123");
    await wrapper.get("[data-testid=signup-confirm-password]").setValue("strongSecret#123");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(auth.isAuthenticated).toBe(true);
    expect(auth.user?.name).toBe("Morgan Drake");
    expect(router.currentRoute.value.path).toBe("/projects");
  });

  it("shows error when passwords do not match", async () => {
    const wrapper = mount(SignupView, {
      global: { plugins: [router] },
    });

    await wrapper.get("[data-testid=signup-name]").setValue("Morgan Drake");
    await wrapper.get("[data-testid=signup-email]").setValue("morgan@expo.com");
    await wrapper.get("[data-testid=signup-password]").setValue("strongSecret#123");
    await wrapper.get("[data-testid=signup-confirm-password]").setValue("differentSecret#456");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.find("[data-testid=signup-error]").exists()).toBe(true);
    expect(wrapper.get("[data-testid=signup-error]").text()).toContain("Passwords do not match");
  });

  it("calculates password strength dynamically", async () => {
    const wrapper = mount(SignupView, {
      global: { plugins: [router] },
    });

    await wrapper.get("[data-testid=signup-password]").setValue("abc");
    expect(wrapper.text()).toContain("Weak");

    await wrapper.get("[data-testid=signup-password]").setValue("abc1234567");
    expect(wrapper.text()).toContain("Good");

    await wrapper.get("[data-testid=signup-password]").setValue("abc1234567!#$");
    expect(wrapper.text()).toContain("Strong");
  });
});
