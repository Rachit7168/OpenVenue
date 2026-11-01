<script setup lang="ts">
import { RouterView } from "vue-router";
import ToastContainer from "./components/ToastContainer.vue";
import TopBar from "./components/TopBar.vue";
import { useAuthStore } from "./stores/auth";
import { useThemeStore } from "./stores/theme";

useThemeStore().hydrate();
useAuthStore().hydrate();
</script>

<template>
  <div
    class="min-h-screen bg-zinc-100 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100"
  >
    <a
      href="#content"
      class="focus-ring sr-only absolute left-4 top-4 z-50 rounded-md bg-white px-3 py-2 text-sm font-medium text-zinc-950 focus:not-sr-only dark:bg-zinc-900 dark:text-zinc-100"
    >
      Skip to content
    </a>
    <TopBar />
    <div id="content">
      <RouterView />
    </div>
    <ToastContainer />
  </div>
</template>
