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

function handleSignOut() {
  userMenuOpen.value = false;
  mobileMenuOpen.value = false;
  auth.logout();
  toast.info("Signed out", "You have been signed out.");
  void router.push("/");
}

function isCurrentRoute(path: string): boolean {
  if (path === "/" && route.path === "/") return true;
  if (path !== "/" && route.path.startsWith(path)) return true;
  return false;
}
</script>

<template>
  <header
    class="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90"
  >
    <div class="mx-auto flex h-14 max-w-[90rem] items-center justify-between gap-4 px-4 sm:px-6">
      <!-- Logo and Brand -->
      <div class="flex items-center gap-3">
        <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
          <rect width="32" height="32" rx="6" class="fill-teal-800 dark:fill-teal-500" />
          <rect
            x="6"
            y="6"
            width="20"
            height="20"
            rx="2"
            fill="none"
            class="stroke-teal-50"
            stroke-width="2"
          />
          <rect x="10" y="14" width="8" height="8" class="fill-teal-200" />
        </svg>
        <RouterLink
          to="/"
          class="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:focus-visible:ring-teal-400"
        >
          <div class="flex items-center gap-2">
            <p
              class="text-sm font-semibold leading-tight tracking-tight text-zinc-900 dark:text-zinc-100"
            >
              OpenVenue
            </p>
            <span
              class="rounded bg-teal-100 px-1.5 py-0.2 text-[10px] font-medium text-teal-800 dark:bg-teal-950 dark:text-teal-300"
            >
              v0.1.0
            </span>
          </div>
          <p class="text-xs text-zinc-700 dark:text-zinc-300">Local venue document</p>
        </RouterLink>
      </div>

      <!-- Desktop Navigation Links -->
      <nav class="hidden md:flex items-center gap-1.5" aria-label="Main Navigation">
        <RouterLink
          to="/"
          class="focus-ring inline-flex min-h-9 items-center rounded-md px-3 text-sm font-medium transition"
          :class="
            isCurrentRoute('/') && route.path === '/'
              ? 'bg-zinc-100 text-teal-800 dark:bg-zinc-800 dark:text-teal-300'
              : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
          "
        >
          Home
        </RouterLink>

        <RouterLink
          to="/projects"
          class="focus-ring inline-flex min-h-9 items-center rounded-md px-3 text-sm font-medium transition"
          :class="
            isCurrentRoute('/projects')
              ? 'bg-zinc-100 text-teal-800 dark:bg-zinc-800 dark:text-teal-300'
              : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
          "
        >
          Projects
        </RouterLink>

        <RouterLink
          to="/guide"
          class="focus-ring inline-flex min-h-9 items-center rounded-md px-3 text-sm font-medium transition"
          :class="
            isCurrentRoute('/guide')
              ? 'bg-zinc-100 text-teal-800 dark:bg-zinc-800 dark:text-teal-300'
              : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
          "
        >
          Guide
        </RouterLink>

        <RouterLink
          to="/benchmark"
          class="focus-ring inline-flex min-h-9 items-center rounded-md px-3 text-sm font-medium transition"
          :class="
            isCurrentRoute('/benchmark')
              ? 'bg-zinc-100 text-teal-800 dark:bg-zinc-800 dark:text-teal-300'
              : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
          "
        >
          Benchmarks
        </RouterLink>
      </nav>

      <!-- Right Hand Actions: Theme toggle, Auth state -->
      <div class="flex items-center gap-2">
        <!-- Theme Toggle -->
        <button
          type="button"
          data-testid="theme-toggle"
          class="inline-flex min-h-10 items-center rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus-visible:ring-teal-400"
          :aria-label="label"
          @click="theme.toggle()"
        >
          {{ theme.mode === "dark" ? "Light" : "Dark" }}
        </button>

        <!-- Authenticated State Menu -->
        <div v-if="auth.isAuthenticated" class="relative">
          <button
            type="button"
            data-testid="user-menu-button"
            class="focus-ring flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 p-1 pr-2.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-750"
            :aria-expanded="userMenuOpen"
            @click="userMenuOpen = !userMenuOpen"
          >
            <span
              class="flex h-7 w-7 items-center justify-center rounded-full bg-teal-800 text-[11px] font-bold text-white dark:bg-teal-500 dark:text-zinc-950"
            >
              {{ userInitials }}
            </span>
            <span class="max-w-[100px] truncate text-zinc-900 dark:text-zinc-100 sm:max-w-none">
              {{ auth.user?.name }}
            </span>
            <svg
              class="h-3 w-3 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          <!-- Backdrop -->
          <div v-if="userMenuOpen" class="fixed inset-0 z-40" @click="userMenuOpen = false" />

          <!-- Dropdown Popover -->
          <div
            v-if="userMenuOpen"
            data-testid="user-dropdown"
            class="absolute right-0 mt-2 z-50 w-56 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div class="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
              <p class="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {{ auth.user?.name }}
              </p>
              <p class="text-[11px] text-zinc-500 truncate">
                {{ auth.user?.email }}
              </p>
              <span
                v-if="auth.isGuest"
                class="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300"
              >
                Guest Session
              </span>
            </div>

            <div class="py-1">
              <RouterLink
                to="/account"
                class="flex w-full items-center rounded-lg px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                @click="userMenuOpen = false"
              >
                Account &amp; Profile
              </RouterLink>
              <RouterLink
                to="/projects"
                class="flex w-full items-center rounded-lg px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                @click="userMenuOpen = false"
              >
                My Venues
              </RouterLink>
            </div>

            <div class="border-t border-zinc-100 pt-1 dark:border-zinc-800">
              <button
                type="button"
                data-testid="nav-sign-out"
                class="flex w-full items-center rounded-lg px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                @click="handleSignOut"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>

        <!-- Unauthenticated State: Sign In / Sign Up buttons -->
        <div v-else class="flex items-center gap-2">
          <RouterLink
            to="/login"
            data-testid="nav-login"
            class="focus-ring inline-flex min-h-9 items-center rounded-md px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Sign in
          </RouterLink>
          <RouterLink
            to="/signup"
            data-testid="nav-signup"
            class="focus-ring inline-flex min-h-9 items-center rounded-md bg-teal-800 px-3 text-xs font-medium text-white hover:bg-teal-900 dark:bg-teal-400 dark:text-zinc-950 dark:hover:bg-teal-300"
          >
            Sign up
          </RouterLink>
        </div>

        <!-- Mobile Menu Toggle Button -->
        <button
          type="button"
          data-testid="mobile-menu-toggle"
          class="md:hidden focus-ring rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
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

    <!-- Mobile Drawer Menu -->
    <div
      v-if="mobileMenuOpen"
      data-testid="mobile-menu"
      class="md:hidden border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div class="flex flex-col gap-1">
        <RouterLink
          to="/"
          class="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          @click="mobileMenuOpen = false"
        >
          Home
        </RouterLink>
        <RouterLink
          to="/projects"
          class="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          @click="mobileMenuOpen = false"
        >
          Projects
        </RouterLink>
        <RouterLink
          to="/guide"
          class="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          @click="mobileMenuOpen = false"
        >
          Guide
        </RouterLink>
        <RouterLink
          to="/benchmark"
          class="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          @click="mobileMenuOpen = false"
        >
          Benchmarks
        </RouterLink>

        <div
          v-if="auth.isAuthenticated"
          class="mt-2 border-t border-zinc-200 pt-2 dark:border-zinc-800"
        >
          <RouterLink
            to="/account"
            class="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            @click="mobileMenuOpen = false"
          >
            Account Settings
          </RouterLink>
          <button
            type="button"
            class="w-full text-left rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            @click="handleSignOut"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
