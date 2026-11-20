<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>

<template>
  <footer
    class="border-t"
    style="border-color: var(--line); background: var(--paper-raised)"
    role="contentinfo"
  >
    <div class="mx-auto grid max-w-[90rem] gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
      <div>
        <p class="brand-word">OpenVenue</p>
        <p class="mt-3 max-w-sm text-sm" style="color: var(--ink-soft)">
          Local-first venue drafting for events — plan, walk, and export from one document.
        </p>
      </div>
      <div>
        <p class="text-sm font-semibold">Product</p>
        <div class="mt-3 flex flex-col gap-2 text-sm" style="color: var(--ink-soft)">
          <RouterLink to="/projects">Projects</RouterLink>
          <RouterLink to="/guide">Guide</RouterLink>
          <RouterLink to="/benchmark">Benchmarks</RouterLink>
        </div>
      </div>
      <div>
        <p class="text-sm font-semibold">Account</p>
        <div class="mt-3 flex flex-col gap-2 text-sm" style="color: var(--ink-soft)">
          <RouterLink to="/login">Sign in</RouterLink>
          <RouterLink to="/signup">Sign up</RouterLink>
          <RouterLink to="/account">Profile</RouterLink>
        </div>
      </div>
    </div>
    <div
      class="border-t px-4 py-4 text-center text-xs sm:px-6"
      style="border-color: var(--line); color: var(--ink-soft)"
    >
      Apache-2.0 · Draft venues on this device
    </div>
  </footer>
</template>
