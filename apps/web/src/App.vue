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
  <div class="app-shell">
    <a
      href="#content"
      class="focus-ring sr-only absolute left-4 top-4 z-50 rounded-md px-3 py-2 text-sm font-medium"
      style="background: var(--paper-raised); color: var(--ink)"
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
