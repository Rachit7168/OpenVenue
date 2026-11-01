import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import { routes } from "../router";
import { useAuthStore } from "../stores/auth";
import LoginView from "./LoginView.vue";

describe("LoginView", () => {
  let router: ReturnType<typeof createRouter>;

  beforeEach(async () => {
    setActivePinia(createPinia());
    localStorage.clear();
    router = createRouter({
      history: createMemoryHistory(),
      routes,
    });
    await router.push("/login");
    await router.isReady();
  });

  it("renders login form and quick guest button", () => {
    const wrapper = mount(LoginView, {
      global: { plugins: [router] },
    });

    expect(wrapper.text()).toContain("Welcome back");
    expect(wrapper.find("[data-testid=guest-login-button]").exists()).toBe(true);
    expect(wrapper.find("[data-testid=login-email]").exists()).toBe(true);
    expect(wrapper.find("[data-testid=login-password]").exists()).toBe(true);
    expect(wrapper.find("[data-testid=login-submit]").exists()).toBe(true);
  });

  it("logs in with valid credentials and redirects to projects", async () => {
    const auth = useAuthStore();
    const wrapper = mount(LoginView, {
      global: { plugins: [router] },
    });

    await wrapper.get("[data-testid=login-email]").setValue("designer@venue.com");
    await wrapper.get("[data-testid=login-password]").setValue("securepassword");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(auth.isAuthenticated).toBe(true);
    expect(auth.user?.email).toBe("designer@venue.com");
    expect(router.currentRoute.value.path).toBe("/projects");
  });

  it("activates instant guest login when clicking guest button", async () => {
    const auth = useAuthStore();
    const wrapper = mount(LoginView, {
      global: { plugins: [router] },
    });

    await wrapper.get("[data-testid=guest-login-button]").trigger("click");
    await flushPromises();

    expect(auth.isAuthenticated).toBe(true);
    expect(auth.isGuest).toBe(true);
    expect(router.currentRoute.value.path).toBe("/projects");
  });

  it("toggles password visibility", async () => {
    const wrapper = mount(LoginView, {
      global: { plugins: [router] },
    });

    const passwordInput = wrapper.get("[data-testid=login-password]");
    expect(passwordInput.attributes("type")).toBe("password");

    await wrapper.get("[data-testid=toggle-password]").trigger("click");
    expect(passwordInput.attributes("type")).toBe("text");

    await wrapper.get("[data-testid=toggle-password]").trigger("click");
    expect(passwordInput.attributes("type")).toBe("password");
  });

  it("displays error when submitting invalid format", async () => {
    const wrapper = mount(LoginView, {
      global: { plugins: [router] },
    });

    await wrapper.get("[data-testid=login-email]").setValue("invalid-email");
    await wrapper.get("[data-testid=login-password]").setValue("123");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.find("[data-testid=login-error]").exists()).toBe(true);
    expect(wrapper.get("[data-testid=login-error]").text()).toContain("valid email address");
  });
});
