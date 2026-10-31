<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useThemeStore } from "../stores/theme";

const theme = useThemeStore();
const label = computed(() =>
  theme.mode === "dark" ? "Switch to light mode" : "Switch to dark mode",
);
</script>

<template>
  <header
    class="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90"
  >
    <div class="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
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
          <p class="text-sm font-semibold leading-tight tracking-tight">OpenVenue</p>
          <p class="text-xs text-zinc-500 dark:text-zinc-400">Local venue document</p>
        </RouterLink>
      </div>
      <button
        type="button"
        data-testid="theme-toggle"
        class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus-visible:ring-teal-400"
        :aria-label="label"
        @click="theme.toggle()"
      >
        {{ theme.mode === "dark" ? "Light" : "Dark" }}
      </button>
    </div>
  </header>
</template>
