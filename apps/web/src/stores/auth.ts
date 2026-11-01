import { defineStore } from "pinia";
import { computed, ref } from "vue";

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

const STORAGE_KEY = "openvenue-auth-user";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<UserProfile | null>(null);
  const isLoading = ref(false);
  const error = ref("");

  const isAuthenticated = computed(() => user.value !== null);
  const isGuest = computed(() => Boolean(user.value?.isGuest));

  function hydrate(): void {
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
      if (profile) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore localStorage write errors in constrained environments
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

    if (credentials.password.length < 6) {
      isLoading.value = false;
      error.value = "Password must be at least 6 characters.";
      throw new Error(error.value);
    }

    // Generate/retrieve user profile (local-first friendly)
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

    if (!credentials.password || credentials.password.length < 6) {
      isLoading.value = false;
      error.value = "Password must be at least 6 characters long.";
      throw new Error(error.value);
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

  function updateProfile(updates: Partial<UserProfile>): UserProfile | null {
    if (!user.value) {
      return null;
    }
    const updated: UserProfile = {
      ...user.value,
      ...updates,
    };
    persist(updated);
    return updated;
  }

  function logout(): void {
    persist(null);
    error.value = "";
  }

  // Hydrate store on initialization
  hydrate();

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    isGuest,
    hydrate,
    login,
    signup,
    continueAsGuest,
    loginWithProvider,
    requestPasswordReset,
    updateProfile,
    logout,
  };
});
