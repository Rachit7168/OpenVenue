<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useProjectLibrary } from "../stores/projects";
import { useToastStore } from "../stores/toast";

const auth = useAuthStore();
const library = useProjectLibrary();
const toast = useToastStore();
const router = useRouter();

const name = ref(auth.user?.name ?? "Venue Designer");
const organization = ref(auth.user?.organization ?? "OpenVenue Studio");
const role = ref(auth.user?.role ?? "Lead Designer");

const initials = computed(() => {
  const parts = (auth.user?.name ?? "VD").trim().split(" ");
  const first = parts[0];
  const second = parts[1];
  if (first && second && first.length > 0 && second.length > 0) {
    return ((first[0] ?? "") + (second[0] ?? "")).toUpperCase();
  }
  return (auth.user?.name ?? "V").slice(0, 2).toUpperCase();
});

function handleSaveProfile() {
  auth.updateProfile({
    name: name.value,
    organization: organization.value,
    role: role.value,
  });
  toast.success("Profile updated", "Your profile changes have been saved.");
}

function handleSignOut() {
  auth.logout();
  toast.info("Signed out", "You have been signed out.");
  void router.push("/");
}

function exportAllBackup() {
  const data = JSON.stringify(library.projects, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `openvenue-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast.success("Backup downloaded", `Exported ${library.projects.length} venue documents.`);
}
</script>

<template>
  <main class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
    <!-- Breadcrumb & Title -->
    <div>
      <h1 class="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Account & Profile
      </h1>
      <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Manage your profile, team details, and local-first venue persistence.
      </p>
    </div>

    <!-- Profile Header Card -->
    <div
      class="mt-6 flex flex-col gap-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-center gap-4">
        <div
          class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-teal-800 text-xl font-bold text-white shadow-inner dark:bg-teal-500 dark:text-zinc-950"
        >
          {{ initials }}
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {{ auth.user?.name ?? "Guest Designer" }}
            </h2>
            <span
              v-if="auth.isGuest"
              class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300"
            >
              Guest
            </span>
            <span
              v-else
              class="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800 dark:bg-teal-950 dark:text-teal-300"
            >
              Verified
            </span>
          </div>
          <p class="text-sm text-zinc-500 dark:text-zinc-400">
            {{ auth.user?.email ?? "guest@openvenue.local" }}
          </p>
          <p class="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
            {{ auth.user?.role }} · {{ auth.user?.organization }}
          </p>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="account-sign-out"
          class="focus-ring rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          @click="handleSignOut"
        >
          Sign out
        </button>
      </div>
    </div>

    <!-- Edit Profile Section -->
    <div
      class="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h3 class="text-base font-semibold text-zinc-900 dark:text-zinc-100">Profile Settings</h3>
      <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Update how your identity appears in shared venue metadata and project export manifests.
      </p>

      <form class="mt-4 grid gap-4 sm:grid-cols-2" @submit.prevent="handleSaveProfile">
        <label class="block text-sm font-medium">
          Full Name
          <input
            v-model="name"
            required
            class="focus-ring mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>

        <label class="block text-sm font-medium">
          Professional Title
          <input
            v-model="role"
            class="focus-ring mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>

        <label class="block text-sm font-medium sm:col-span-2">
          Studio / Organization
          <input
            v-model="organization"
            class="focus-ring mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>

        <div class="sm:col-span-2">
          <button
            type="submit"
            data-testid="save-profile-btn"
            class="focus-ring rounded-lg bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900 dark:bg-teal-400 dark:text-zinc-950 dark:hover:bg-teal-300"
          >
            Save changes
          </button>
        </div>
      </form>
    </div>

    <!-- Storage & Backup Section -->
    <div
      class="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h3 class="text-base font-semibold text-zinc-900 dark:text-zinc-100">
        Local-First Storage & Data Safety
      </h3>
      <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        All venues are saved locally in your browser's IndexedDB and localStorage caches.
      </p>

      <div class="mt-4 grid gap-3 sm:grid-cols-3">
        <div
          class="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <p class="text-xs text-zinc-500">Saved Projects</p>
          <p class="mt-1 text-2xl font-bold">{{ library.projects.length }}</p>
        </div>
        <div
          class="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <p class="text-xs text-zinc-500">Database Engine</p>
          <p class="mt-1 text-2xl font-bold text-teal-800 dark:text-teal-400">IndexedDB</p>
        </div>
        <div
          class="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <p class="text-xs text-zinc-500">Privacy Status</p>
          <p class="mt-1 text-sm font-bold text-teal-700 dark:text-teal-300">
            100% Offline Capable
          </p>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          class="focus-ring rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          @click="exportAllBackup"
        >
          Export All Projects Backup (JSON)
        </button>
      </div>
    </div>
  </main>
</template>
