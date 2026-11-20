<script setup lang="ts">
import { computed, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useThemeStore } from "../stores/theme";
import { useToastStore } from "../stores/toast";

const theme = useThemeStore();
const auth = useAuthStore();
const toast = useToastStore();
const route = useRoute();
const router = useRouter();

const userMenuOpen = ref(false);
const mobileMenuOpen = ref(false);

const label = computed(() =>
  theme.mode === "dark" ? "Switch to light mode" : "Switch to dark mode",
);

const userInitials = computed(() => {
  if (!auth.user?.name) return "OV";
  const parts = auth.user.name.trim().split(" ");
  const first = parts[0];
  const second = parts[1];
  if (first && second && first.length > 0 && second.length > 0) {
    return ((first[0] ?? "") + (second[0] ?? "")).toUpperCase();
  }
  return auth.user.name.slice(0, 2).toUpperCase();
});

async function handleSignOut() {
  userMenuOpen.value = false;
  mobileMenuOpen.value = false;
  try {
    await auth.logout();
    toast.info("Signed out", "You have been signed out.");
    void router.push("/");
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Could not sign out.";
    toast.error("Sign out failed", message);
  }
}

function isCurrentRoute(path: string): boolean {
  if (path === "/" && route.path === "/") return true;
  if (path !== "/" && route.path.startsWith(path)) return true;
  return false;
}

function navClass(path: string): string {
  return isCurrentRoute(path) ? "nav-link nav-link-active" : "nav-link";
}
</script>

<template>
  <header class="site-header">
    <div class="mx-auto flex h-14 max-w-[90rem] items-center justify-between gap-4 px-4 sm:px-6">
      <div class="flex items-center gap-3">
        <div class="brand-mark" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect
              x="2"
              y="2"
              width="12"
              height="12"
              rx="1.5"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <rect x="5" y="8" width="5" height="4" fill="currentColor" opacity="0.85" />
          </svg>
        </div>
        <RouterLink to="/" class="focus-ring rounded-sm">
          <p class="brand-word">OpenVenue</p>
          <p class="mt-0.5 text-[11px]" style="color: var(--ink-soft)">Draft venues locally</p>
        </RouterLink>
      </div>

      <nav class="hidden items-center gap-1 md:flex" aria-label="Main Navigation">
        <RouterLink to="/" :class="navClass('/')">Home</RouterLink>
        <RouterLink to="/projects" :class="navClass('/projects')">Projects</RouterLink>
        <RouterLink to="/guide" :class="navClass('/guide')">Guide</RouterLink>
        <RouterLink to="/benchmark" :class="navClass('/benchmark')">Benchmarks</RouterLink>
      </nav>

      <div class="flex items-center gap-2">
        <button
          type="button"
          data-testid="theme-toggle"
          class="btn btn-secondary min-h-10 px-3 text-xs"
          :aria-label="label"
          @click="theme.toggle()"
        >
          {{ theme.mode === "dark" ? "Light" : "Dark" }}
        </button>

        <div v-if="auth.isAuthenticated" class="relative">
          <button
            type="button"
            data-testid="user-menu-button"
            class="focus-ring flex items-center gap-2 border px-2 py-1 text-xs font-medium"
            style="
              border-color: var(--line);
              border-radius: 0.7rem;
              background: var(--paper-raised);
            "
            :aria-expanded="userMenuOpen"
            @click="userMenuOpen = !userMenuOpen"
          >
            <span
              class="flex h-7 w-7 items-center justify-center text-[11px] font-bold"
              style="border-radius: 0.55rem; background: var(--accent); color: #f4fffc"
            >
              {{ userInitials }}
            </span>
            <span class="max-w-[100px] truncate sm:max-w-none">{{ auth.user?.name }}</span>
          </button>

          <div v-if="userMenuOpen" class="fixed inset-0 z-40" @click="userMenuOpen = false" />

          <div
            v-if="userMenuOpen"
            data-testid="user-dropdown"
            class="absolute right-0 z-50 mt-2 w-56 border p-1.5"
            style="
              border-color: var(--line);
              border-radius: 0.9rem;
              background: var(--paper-raised);
              box-shadow: var(--shadow);
            "
          >
            <div class="border-b px-3 py-2" style="border-color: var(--line)">
              <p class="truncate text-xs font-semibold">{{ auth.user?.name }}</p>
              <p class="truncate text-[11px]" style="color: var(--ink-soft)">
                {{ auth.user?.email }}
              </p>
            </div>
            <div class="py-1">
              <RouterLink
                to="/account"
                class="flex w-full items-center rounded-lg px-3 py-1.5 text-xs hover:opacity-80"
                @click="userMenuOpen = false"
              >
                Account &amp; Profile
              </RouterLink>
              <RouterLink
                to="/projects"
                class="flex w-full items-center rounded-lg px-3 py-1.5 text-xs hover:opacity-80"
                @click="userMenuOpen = false"
              >
                My Venues
              </RouterLink>
            </div>
            <div class="border-t pt-1" style="border-color: var(--line)">
              <button
                type="button"
                data-testid="nav-sign-out"
                class="flex w-full items-center rounded-lg px-3 py-1.5 text-xs"
                style="color: var(--danger)"
                @click="handleSignOut"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>

        <div v-else class="flex items-center gap-2">
          <RouterLink to="/login" data-testid="nav-login" class="nav-link">Sign in</RouterLink>
          <RouterLink
            to="/signup"
            data-testid="nav-signup"
            class="btn btn-primary min-h-9 px-3 text-xs"
          >
            Sign up
          </RouterLink>
        </div>

        <button
          type="button"
          data-testid="mobile-menu-toggle"
          class="focus-ring rounded-lg p-2 md:hidden"
          :aria-expanded="mobileMenuOpen"
          aria-label="Toggle navigation menu"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              v-if="!mobileMenuOpen"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
            <path
              v-else
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>

    <div
      v-if="mobileMenuOpen"
      data-testid="mobile-menu"
      class="border-b px-4 py-3 md:hidden"
      style="border-color: var(--line); background: var(--paper-raised)"
    >
      <div class="flex flex-col gap-1">
        <RouterLink to="/" class="nav-link" @click="mobileMenuOpen = false">Home</RouterLink>
        <RouterLink to="/projects" class="nav-link" @click="mobileMenuOpen = false"
          >Projects</RouterLink
        >
        <RouterLink to="/guide" class="nav-link" @click="mobileMenuOpen = false">Guide</RouterLink>
        <RouterLink to="/benchmark" class="nav-link" @click="mobileMenuOpen = false"
          >Benchmarks</RouterLink
        >
        <template v-if="auth.isAuthenticated">
          <RouterLink to="/account" class="nav-link" @click="mobileMenuOpen = false">
            Account Settings
          </RouterLink>
          <button
            type="button"
            class="nav-link text-left"
            style="color: var(--danger)"
            @click="handleSignOut"
          >
            Sign out
          </button>
        </template>
      </div>
    </div>
  </header>
</template>
