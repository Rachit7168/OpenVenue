import { defineStore } from "pinia";
import { ref } from "vue";

export type ThemeMode = "dark" | "light";

const STORAGE_KEY = "openvenue-theme";

export const useThemeStore = defineStore("theme", () => {
  const mode = ref<ThemeMode>("dark");

  function apply(next: ThemeMode) {
    mode.value = next;
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be blocked. The class on the document still updates.
    }
  }

  function hydrate() {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      stored = null;
    }
    apply(stored === "light" ? "light" : "dark");
  }

  function toggle() {
    apply(mode.value === "dark" ? "light" : "dark");
  }

  return { mode, hydrate, toggle };
});
