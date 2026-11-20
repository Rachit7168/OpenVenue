<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { focusFirst } from "./focus";
import { clearChromePopover, closeChromePanels, openFindChrome, openSearchChrome } from "./panels";

const findOpen = defineModel<boolean>("findOpen", { default: false });
const searchOpen = defineModel<boolean>("searchOpen", { default: false });
const popoverOpen = defineModel<boolean>("popoverOpen", { default: false });
const searchQuery = defineModel<string>("searchQuery", { default: "" });

const emit = defineEmits<{
  dismissPopover: [];
  closePopover: [];
}>();

const findPanel = ref<HTMLElement | null>(null);
const searchPanel = ref<HTMLElement | null>(null);
const popoverPanel = ref<HTMLElement | null>(null);

function dismissPopover() {
  if (!popoverOpen.value) {
    return;
  }
  popoverOpen.value = false;
  emit("dismissPopover");
}

function openFind() {
  dismissPopover();
  const chrome = openFindChrome();
  findOpen.value = chrome.findOpen;
  searchOpen.value = chrome.searchOpen;
  void nextTick(() => focusFirst(findPanel.value));
}

function openSearch() {
  dismissPopover();
  const chrome = openSearchChrome();
  findOpen.value = chrome.findOpen;
  searchOpen.value = chrome.searchOpen;
  void nextTick(() => {
    window.document.getElementById("map-search-input")?.focus();
  });
}

function closePanels() {
  const chrome = closeChromePanels({
    findOpen: findOpen.value,
    searchOpen: searchOpen.value,
    popoverOpen: popoverOpen.value,
  });
  findOpen.value = chrome.findOpen;
  searchOpen.value = chrome.searchOpen;
}

function closePopover() {
  clearChromePopover({
    findOpen: findOpen.value,
    searchOpen: searchOpen.value,
    popoverOpen: true,
  });
  popoverOpen.value = false;
  emit("closePopover");
}

function toggleFind() {
  if (findOpen.value) {
    closePanels();
  } else {
    openFind();
  }
}

function toggleSearch() {
  if (searchOpen.value) {
    closePanels();
  } else {
    openSearch();
  }
}

watch(popoverOpen, (open) => {
  if (open) {
    void nextTick(() => focusFirst(popoverPanel.value));
  }
});

defineExpose({
  openFind,
  openSearch,
  closePanels,
  closePopover,
  findPanel,
  searchPanel,
  popoverPanel,
  toggleFind,
  toggleSearch,
});
</script>

<template>
  <div class="dialog-chrome">
    <aside
      v-if="findOpen"
      ref="findPanel"
      class="side-panel"
      data-testid="find-panel"
      role="dialog"
      aria-modal="true"
      aria-label="Find a place"
      tabindex="-1"
    >
      <header>
        <h2 id="find-title">Find a place</h2>
        <button type="button" class="ghost" aria-label="Close find" @click="closePanels">×</button>
      </header>
      <slot name="find" />
    </aside>

    <aside
      v-if="searchOpen"
      ref="searchPanel"
      class="side-panel"
      data-testid="search-panel"
      role="dialog"
      aria-modal="true"
      aria-label="Search the map"
      tabindex="-1"
    >
      <header>
        <h2 id="search-title">Search the map</h2>
        <button type="button" class="ghost" aria-label="Close search" @click="closePanels">
          ×
        </button>
      </header>
      <label class="search-field">
        <span class="sr-only">Rooms, food, floors</span>
        <input
          id="map-search-input"
          v-model="searchQuery"
          type="search"
          role="searchbox"
          placeholder="Rooms, food, floors…"
          aria-controls="search-results"
        />
      </label>
      <div id="search-results" role="listbox" aria-label="Search results">
        <slot name="search" />
      </div>
    </aside>

    <article
      v-if="popoverOpen"
      ref="popoverPanel"
      class="place-popover"
      data-testid="place-popover"
      role="dialog"
      aria-modal="true"
      aria-label="Place details"
      tabindex="-1"
    >
      <button type="button" class="ghost close" aria-label="Close" @click="closePopover">×</button>
      <slot name="popover" />
    </article>

    <div class="chrome-left">
      <button
        type="button"
        data-map-chrome="find"
        data-testid="open-find"
        :aria-pressed="findOpen"
        @click="toggleFind"
      >
        Find
      </button>
      <button
        type="button"
        data-map-chrome="search"
        data-testid="open-search"
        :aria-pressed="searchOpen"
        @click="toggleSearch"
      >
        Search
      </button>
    </div>
  </div>
</template>

<style scoped>
.dialog-chrome {
  display: contents;
}
.side-panel {
  position: absolute;
  left: 16px;
  top: 16px;
  bottom: 88px;
  width: min(360px, calc(100% - 32px));
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 8px 30px rgba(15, 23, 42, 0.12);
  overflow: auto;
  z-index: 3;
}
.side-panel header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.side-panel h2 {
  margin: 0;
  font-size: 16px;
}
.search-field input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 10px 12px;
}
.place-popover {
  position: absolute;
  left: 50%;
  top: 18%;
  transform: translateX(-50%);
  width: min(360px, calc(100% - 32px));
  padding: 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 8px 30px rgba(15, 23, 42, 0.18);
  z-index: 4;
}
.place-popover .close {
  position: absolute;
  right: 8px;
  top: 8px;
}
.chrome-left {
  position: absolute;
  z-index: 2;
  display: flex;
  gap: 8px;
  left: 16px;
  bottom: 16px;
}
.chrome-left button {
  min-width: 52px;
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 999px;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.12);
  font-weight: 600;
}
.ghost {
  border: 0;
  background: transparent;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
@media (max-width: 720px) {
  .side-panel {
    left: 8px;
    right: 8px;
    width: auto;
    bottom: 140px;
    max-height: min(50vh, 420px);
  }
  .place-popover {
    top: auto;
    bottom: 140px;
    width: calc(100% - 24px);
  }
  .chrome-left {
    bottom: 12px;
  }
  .chrome-left button {
    min-width: 48px;
    min-height: 48px;
    font-size: 14px;
  }
}
</style>
