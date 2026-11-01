import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "./auth";

describe("auth store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it("starts unauthenticated when storage is empty", () => {
    const auth = useAuthStore();
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.user).toBeNull();
  });

  it("logs in with valid credentials and formats display name", async () => {
    const auth = useAuthStore();
    const profile = await auth.login({
      email: "ada.lovelace@example.com",
      password: "securepassword",
    });

    expect(auth.isAuthenticated).toBe(true);
    expect(profile.email).toBe("ada.lovelace@example.com");
    expect(profile.name).toBe("Ada lovelace");
    expect(auth.isGuest).toBe(false);
    expect(localStorage.getItem("openvenue-auth-user")).toContain("ada.lovelace@example.com");
  });

  it("rejects invalid email or short password", async () => {
    const auth = useAuthStore();
    await expect(auth.login({ email: "invalid", password: "123" })).rejects.toThrow(
      "valid email address",
    );
    expect(auth.isAuthenticated).toBe(false);

    await expect(auth.login({ email: "test@example.com", password: "123" })).rejects.toThrow(
      "at least 6 characters",
    );
  });

  it("supports guest login mode", () => {
    const auth = useAuthStore();
    const guest = auth.continueAsGuest();
    expect(auth.isAuthenticated).toBe(true);
    expect(auth.isGuest).toBe(true);
    expect(guest.name).toBe("Guest Explorer");
  });

  it("supports third-party social provider login", async () => {
    const auth = useAuthStore();
    const profile = await auth.loginWithProvider("github");
    expect(auth.isAuthenticated).toBe(true);
    expect(profile.organization).toContain("GitHub");
  });

  it("registers a new user through signup", async () => {
    const auth = useAuthStore();
    const profile = await auth.signup({
      name: "Frank Lloyd",
      email: "frank@architecture.org",
      password: "masterarchitect",
      role: "Lead Architect",
    });

    expect(auth.isAuthenticated).toBe(true);
    expect(profile.name).toBe("Frank Lloyd");
    expect(profile.role).toBe("Lead Architect");
  });

  it("updates user profile information", async () => {
    const auth = useAuthStore();
    await auth.login({ email: "user@studio.com", password: "password123" });
    auth.updateProfile({ name: "Studio Director", organization: "Metro Venues" });

    expect(auth.user?.name).toBe("Studio Director");
    expect(auth.user?.organization).toBe("Metro Venues");
  });

  it("logs out and clears persisted state", async () => {
    const auth = useAuthStore();
    await auth.login({ email: "test@domain.com", password: "password123" });
    expect(auth.isAuthenticated).toBe(true);

    auth.logout();
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.user).toBeNull();
    expect(localStorage.getItem("openvenue-auth-user")).toBeNull();
  });
});
