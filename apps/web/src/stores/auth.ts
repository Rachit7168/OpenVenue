import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { ApiError, apiJson, backendAuthEnabled, ensureCsrf } from "../api/client";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  organization?: string;
  isGuest?: boolean;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignupCredentials {
  name: string;
  email: string;
  password: string;
  role?: string;
  organization?: string;
}

interface ApiProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  organization?: string;
  createdAt: string;
}

const STORAGE_KEY = "openvenue-auth-user";

function fromApi(profile: ApiProfile): UserProfile {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    organization: profile.organization,
    createdAt: profile.createdAt,
  };
}

export const useAuthStore = defineStore("auth", () => {
  const user = ref<UserProfile | null>(null);
  const isLoading = ref(false);
  const error = ref("");
  const backendReady = ref(false);
  let sessionEpoch = 0;

  const isAuthenticated = computed(() => user.value !== null);
  const isGuest = computed(() => Boolean(user.value?.isGuest));
  const usesBackend = computed(() => backendAuthEnabled());

  function hydrateFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        user.value = JSON.parse(stored) as UserProfile;
      }
    } catch {
      user.value = null;
    }
  }

  function persist(profile: UserProfile | null): void {
    user.value = profile;
    try {
      if (profile && !profile.isGuest) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore localStorage write errors in constrained environments
    }
  }

  async function refreshSession(): Promise<void> {
    const epoch = ++sessionEpoch;
    if (!backendAuthEnabled()) {
      hydrateFromStorage();
      if (epoch === sessionEpoch) {
        backendReady.value = true;
      }
      return;
    }
    try {
      await ensureCsrf();
      const profile = await apiJson<ApiProfile>("/auth/me/", { method: "GET" });
      if (epoch !== sessionEpoch) {
        return;
      }
      persist(fromApi(profile));
    } catch (caught) {
      if (epoch !== sessionEpoch) {
        return;
      }
      const unauthorized = caught instanceof ApiError && (caught.status === 401 || caught.status === 403);
      if (unauthorized) {
        persist(null);
      } else if (!user.value) {
        hydrateFromStorage();
      }
    } finally {
      if (epoch === sessionEpoch) {
        backendReady.value = true;
      }
    }
  }

  async function login(credentials: LoginCredentials): Promise<UserProfile> {
    isLoading.value = true;
    error.value = "";

    const email = credentials.email.trim();
    if (!email || !credentials.password) {
      isLoading.value = false;
      error.value = "Email and password are required.";
      throw new Error(error.value);
    }

    if (!email.includes("@") || !email.includes(".")) {
      isLoading.value = false;
      error.value = "Please enter a valid email address.";
      throw new Error(error.value);
    }

    const minLength = backendAuthEnabled() ? 8 : 6;
    if (credentials.password.length < minLength) {
      isLoading.value = false;
      error.value = `Password must be at least ${minLength} characters.`;
      throw new Error(error.value);
    }

    if (backendAuthEnabled()) {
      try {
        const epoch = ++sessionEpoch;
        const profile = await apiJson<ApiProfile>("/auth/login/", {
          method: "POST",
          body: JSON.stringify({ email, password: credentials.password }),
        });
        const mapped = fromApi(profile);
        if (epoch === sessionEpoch) {
          persist(mapped);
        }
        isLoading.value = false;
        return mapped;
      } catch (caught) {
        isLoading.value = false;
        error.value = caught instanceof Error ? caught.message : "Sign-in failed.";
        throw caught;
      }
    }

    const rawName = email.split("@")[0] ?? "venue";
    const nameFromEmail = rawName.replace(/[._-]+/g, " ");
    const formattedName = nameFromEmail
      ? nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1)
      : "Venue Designer";

    const profile: UserProfile = {
      id: `usr_${Date.now().toString(36)}`,
      email,
      name: formattedName || "Venue Designer",
      role: "Venue Designer",
      organization: "OpenVenue Studio",
      createdAt: new Date().toISOString(),
    };

    persist(profile);
    isLoading.value = false;
    return profile;
  }

  async function signup(credentials: SignupCredentials): Promise<UserProfile> {
    isLoading.value = true;
    error.value = "";

    const name = credentials.name.trim();
    const email = credentials.email.trim();

    if (!name) {
      isLoading.value = false;
      error.value = "Please enter your full name.";
      throw new Error(error.value);
    }

    if (!email || !email.includes("@") || !email.includes(".")) {
      isLoading.value = false;
      error.value = "Please enter a valid email address.";
      throw new Error(error.value);
    }

    const minLength = backendAuthEnabled() ? 8 : 6;
    if (!credentials.password || credentials.password.length < minLength) {
      isLoading.value = false;
      error.value = `Password must be at least ${minLength} characters long.`;
      throw new Error(error.value);
    }

    if (backendAuthEnabled()) {
      try {
        const epoch = ++sessionEpoch;
        const profile = await apiJson<ApiProfile>("/auth/register/", {
          method: "POST",
          body: JSON.stringify({
            name,
            email,
            password: credentials.password,
            role: credentials.role || "Venue Designer",
            organization: credentials.organization || "",
          }),
        });
        const mapped = fromApi(profile);
        if (epoch === sessionEpoch) {
          persist(mapped);
        }
        isLoading.value = false;
        return mapped;
      } catch (caught) {
        isLoading.value = false;
        error.value = caught instanceof Error ? caught.message : "Sign-up failed.";
        throw caught;
      }
    }

    const profile: UserProfile = {
      id: `usr_${Date.now().toString(36)}`,
      email,
      name,
      role: credentials.role || "Venue Designer",
      organization: credentials.organization || "Independent Studio",
      createdAt: new Date().toISOString(),
    };

    persist(profile);
    isLoading.value = false;
    return profile;
  }

  function continueAsGuest(): UserProfile {
    error.value = "";
    sessionEpoch += 1;
    const profile: UserProfile = {
      id: `guest_${Date.now().toString(36)}`,
      email: "guest@openvenue.local",
      name: "Guest Explorer",
      role: "Guest Designer",
      isGuest: true,
      createdAt: new Date().toISOString(),
    };
    persist(profile);
    return profile;
  }

  async function loginWithProvider(provider: "github" | "google"): Promise<UserProfile> {
    if (backendAuthEnabled()) {
      error.value = "Social sign-in is not wired to the API yet. Use email and password.";
      throw new Error(error.value);
    }
    isLoading.value = true;
    error.value = "";

    const name = provider === "github" ? "GitHub Collaborator" : "Google Designer";
    const email = provider === "github" ? "collaborator@github.com" : "designer@gmail.com";

    const providerLabel = provider === "github" ? "GitHub" : "Google";
    const profile: UserProfile = {
      id: `oauth_${provider}_${Date.now().toString(36)}`,
      email,
      name,
      role: "Lead Architect",
      organization: `${providerLabel} Verified`,
      createdAt: new Date().toISOString(),
    };

    persist(profile);
    isLoading.value = false;
    return profile;
  }

  async function requestPasswordReset(email: string): Promise<boolean> {
    isLoading.value = true;
    error.value = "";

    if (!email || !email.includes("@")) {
      isLoading.value = false;
      error.value = "Please enter a valid email address.";
      throw new Error(error.value);
    }

    isLoading.value = false;
    return true;
  }

  async function updateProfile(updates: Partial<UserProfile>): Promise<UserProfile | null> {
    if (!user.value) {
      return null;
    }
    if (backendAuthEnabled() && !user.value.isGuest) {
      const profile = await apiJson<ApiProfile>("/auth/me/", {
        method: "PATCH",
        body: JSON.stringify({
          name: updates.name,
          email: updates.email,
          role: updates.role,
          organization: updates.organization,
        }),
      });
      const mapped = fromApi(profile);
      persist(mapped);
      return mapped;
    }
    const updated: UserProfile = {
      ...user.value,
      ...updates,
    };
    persist(updated);
    return updated;
  }

  async function logout(): Promise<void> {
    if (backendAuthEnabled() && user.value && !user.value.isGuest) {
      await apiJson("/auth/logout/", { method: "POST" });
    }
    sessionEpoch += 1;
    persist(null);
    error.value = "";
  }

  void refreshSession();

  return {
    user,
    isLoading,
    error,
    backendReady,
    isAuthenticated,
    isGuest,
    usesBackend,
    hydrate: refreshSession,
    login,
    signup,
    continueAsGuest,
    loginWithProvider,
    requestPasswordReset,
    updateProfile,
    logout,
  };
});
