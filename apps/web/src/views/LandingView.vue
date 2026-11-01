<script setup lang="ts">
import { ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import hallStill from "../../../../docs/conference-hall.gif";
import conferenceHallRaw from "../../../../examples/conference-hall.venue.json?raw";
import exhibitionExpoRaw from "../../../../examples/exhibition-expo.venue.json?raw";
import galaBanquetRaw from "../../../../examples/gala-banquet.venue.json?raw";
import hackathonArenaRaw from "../../../../examples/hackathon-arena.venue.json?raw";
import theaterStageRaw from "../../../../examples/theater-stage.venue.json?raw";
import SiteFooter from "../components/SiteFooter.vue";
import { useProjectLibrary } from "../stores/projects";
import { useToastStore } from "../stores/toast";

const router = useRouter();
const library = useProjectLibrary();
const toast = useToastStore();

const activeTab = ref<"plan" | "3d" | "walk" | "map">("plan");

const openFaqIndex = ref<number | null>(0);

function toggleFaq(index: number) {
  openFaqIndex.value = openFaqIndex.value === index ? null : index;
}

function launchTemplateBlueprint(rawJson: string, name: string) {
  try {
    const document = library.importText(rawJson);
    toast.success("Blueprint Loaded", `${name} opened with full layout & furniture.`);
    void router.push({ name: "project", params: { projectId: document.project.id } });
  } catch {
    void router.push("/projects");
  }
}

function launchConferenceHallDemo() {
  launchTemplateBlueprint(conferenceHallRaw, "Conference Auditorium");
}

const faqs = [
  {
    question: "Do I need an account or internet connection to use OpenVenue?",
    answer:
      "No. OpenVenue is 100% local-first. All floor plans, 3D scenes, and project configurations are rendered and saved directly in your web browser via IndexedDB. You can design entirely offline without ever creating an account or sending data to a server.",
  },
  {
    question: "What format does OpenVenue save, and can I export my work?",
    answer:
      "All spaces are saved as an open, standardized venue.json conforming to the draft 2020-12 JSON schema. You can export complete vector SVG blueprints, print-ready PDFs, high-resolution PNG plans, raw JSON, and 3D GLB models compatible with Blender and Unreal Engine.",
  },
  {
    question: "How does the safety and capacity check system work?",
    answer:
      "OpenVenue analyzes room polygons, furniture footprints, aisle clearances, and door opening widths to compute estimated attendee occupancy and highlight potential egress obstructions. These estimates serve as planning guidelines alongside local building regulations.",
  },
  {
    question: "Can I walk through my designed space in 3D?",
    answer:
      "Yes! With a single click, activate Walk mode to explore your event hall in first-person at eye level using standard WASD keys and mouse look. Wall boundaries and physical obstacles prevent clipping so you experience true spatial perspective.",
  },
  {
    question: "Is OpenVenue free and open source?",
    answer:
      "Yes. OpenVenue is distributed under the permissive Apache-2.0 license. The 3D furniture catalogue, 2D geometry engines, and schema are completely open for commercial and personal event production.",
  },
];
</script>

<template>
  <div class="relative overflow-hidden">
    <!-- Background Glow Accents -->
    <div
      class="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[36rem] w-[50rem] -translate-x-1/2 opacity-25 blur-3xl dark:opacity-20"
      style="
        background: radial-gradient(
          circle,
          rgba(20, 184, 166, 0.4) 0%,
          rgba(13, 148, 136, 0.1) 50%,
          transparent 75%
        );
      "
    />

    <!-- Hero Section -->
    <main class="mx-auto max-w-[90rem] px-4 pt-12 pb-16 sm:px-6 lg:pt-20 lg:pb-24">
      <div class="flex flex-col items-center text-center">
        <!-- Release Badge -->
        <div
          class="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-50/80 px-3.5 py-1 text-xs font-medium text-teal-800 backdrop-blur dark:border-teal-400/20 dark:bg-teal-950/50 dark:text-teal-300"
        >
          <span class="inline-block h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
          <span>v0.1.0 Released</span>
          <span class="text-teal-400/60 dark:text-teal-500/60">·</span>
          <span>Open-Source &amp; 100% Local-First</span>
        </div>

        <!-- Main Headline -->
        <h1
          class="mt-6 max-w-4xl text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-6xl sm:leading-[1.1] dark:text-zinc-50"
        >
          Architectural Precision. <br class="hidden sm:inline" />
          <span
            class="bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 bg-clip-text text-transparent dark:from-teal-300 dark:via-teal-200 dark:to-emerald-300"
          >
            Instant 3D.
          </span>
          Event Spaces Built Locally.
        </h1>

        <!-- Subheading -->
        <p
          class="mt-6 max-w-2xl text-base text-zinc-600 sm:text-lg dark:text-zinc-400 leading-relaxed"
        >
          Design exhibition halls, keynote auditoriums, and convention pavilions. Real-time 2D floor
          plans, photorealistic 3D exploration, first-person visitor walkthroughs, and automated
          capacity diagnostics — with zero cloud lock-in.
        </p>

        <!-- CTAs -->
        <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
          <RouterLink
            to="/projects"
            data-testid="open-editor"
            class="focus-ring inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-800 px-6 text-sm font-semibold text-white shadow-md transition hover:bg-teal-900 dark:bg-teal-400 dark:text-zinc-950 dark:hover:bg-teal-300"
          >
            Launch Venue Studio
            <svg class="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </RouterLink>

          <button
            type="button"
            data-testid="hero-demo-button"
            class="focus-ring inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            @click="launchConferenceHallDemo"
          >
            <svg
              class="mr-2 h-4 w-4 text-teal-600 dark:text-teal-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Explore Live Demo
          </button>

          <RouterLink
            to="/guide"
            class="focus-ring inline-flex min-h-11 items-center justify-center rounded-xl border border-transparent px-4 text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
          >
            In-App Guide →
          </RouterLink>
        </div>

        <!-- Capability Pills Ribbon -->
        <div
          class="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-500 dark:text-zinc-400"
        >
          <div class="flex items-center gap-1.5">
            <svg
              class="h-4 w-4 text-teal-600 dark:text-teal-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
            60 FPS Three.js Engine
          </div>
          <div class="flex items-center gap-1.5">
            <svg
              class="h-4 w-4 text-teal-600 dark:text-teal-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
            Sub-millimeter Snapping
          </div>
          <div class="flex items-center gap-1.5">
            <svg
              class="h-4 w-4 text-teal-600 dark:text-teal-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
            IndexedDB Offline Persistence
          </div>
          <div class="flex items-center gap-1.5">
            <svg
              class="h-4 w-4 text-teal-600 dark:text-teal-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clip-rule="evenodd"
              />
            </svg>
            Export to JSON, PDF &amp; GLB
          </div>
        </div>

        <!-- Interactive Showcase Stage -->
        <div
          class="mt-12 w-full max-w-5xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
        >
          <!-- Top bar with tabs -->
          <div
            class="flex flex-wrap items-center justify-between border-b border-zinc-200 bg-zinc-50/80 px-4 py-2.5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80"
          >
            <div class="flex items-center gap-1.5">
              <div class="h-3 w-3 rounded-full bg-red-400/80" />
              <div class="h-3 w-3 rounded-full bg-amber-400/80" />
              <div class="h-3 w-3 rounded-full bg-emerald-400/80" />
              <span class="ml-2 text-xs font-mono text-zinc-500">conference-hall.venue.json</span>
            </div>

            <!-- View switchers -->
            <div
              class="flex items-center gap-1 rounded-lg bg-zinc-200/60 p-1 dark:bg-zinc-800/60 text-xs font-medium"
            >
              <button
                type="button"
                class="rounded-md px-2.5 py-1 transition"
                :class="
                  activeTab === 'plan'
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                "
                @click="activeTab = 'plan'"
              >
                2D Floor Plan
              </button>
              <button
                type="button"
                class="rounded-md px-2.5 py-1 transition"
                :class="
                  activeTab === '3d'
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                "
                @click="activeTab = '3d'"
              >
                3D Hall
              </button>
              <button
                type="button"
                class="rounded-md px-2.5 py-1 transition"
                :class="
                  activeTab === 'walk'
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                "
                @click="activeTab = 'walk'"
              >
                WASD Walk
              </button>
              <button
                type="button"
                class="rounded-md px-2.5 py-1 transition"
                :class="
                  activeTab === 'map'
                    ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                "
                @click="activeTab = 'map'"
              >
                Cutaway Map
              </button>
            </div>
          </div>

          <!-- Showcase Visual Stage -->
          <div class="relative bg-zinc-950">
            <img
              :src="hallStill"
              alt="Plan, 3D hall, and walk toward stage"
              class="w-full object-cover max-h-[520px]"
            />

            <!-- Contextual Overlay Pill -->
            <div
              class="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-zinc-950/80 p-4 text-left backdrop-blur sm:bottom-6 sm:left-6 sm:right-6"
            >
              <div>
                <div class="flex items-center gap-2">
                  <span class="inline-block h-2 w-2 rounded-full bg-teal-400" />
                  <p class="text-sm font-semibold text-white">
                    <span v-if="activeTab === 'plan'"
                      >2D Vector Editor: Sub-centimeter Snapping</span
                    >
                    <span v-else-if="activeTab === '3d'"
                      >3D Real-time View: Orbit, Isometric &amp; Materials</span
                    >
                    <span v-else-if="activeTab === 'walk'"
                      >First-Person Walk: WASD Physical Collision</span
                    >
                    <span v-else>Multi-level Cutaway: Isolated Floor Plates</span>
                  </p>
                </div>
                <p class="mt-1 text-xs text-zinc-300">
                  <span v-if="activeTab === 'plan'"
                    >Draw walls, rooms, doors and furniture with automated dimension overlays and
                    clearance guides.</span
                  >
                  <span v-else-if="activeTab === '3d'"
                    >PBR shaders with wood, concrete, carpet and glass. Gizmos to Move, Rotate and
                    Scale furniture in 3D.</span
                  >
                  <span v-else-if="activeTab === 'walk'"
                    >Walk your venue as an attendee before construction. Walls stop movement and
                    doors remain accessible.</span
                  >
                  <span v-else
                    >Inspect multi-level spaces in separated cutaway plates. Click any floor to
                    isolate and inspect layout.</span
                  >
                </p>
              </div>
              <button
                type="button"
                class="focus-ring shrink-0 rounded-lg bg-teal-500 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-teal-400"
                @click="launchConferenceHallDemo"
              >
                Open This Hall
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Venue Templates Gallery -->
    <section
      class="border-t border-zinc-200 bg-zinc-50/60 py-16 dark:border-zinc-800 dark:bg-zinc-950/40"
    >
      <div class="mx-auto max-w-[90rem] px-4 sm:px-6">
        <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p class="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400">
              Quick-Start Blueprints
            </p>
            <h2
              class="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50"
            >
              Ready-to-use Venue Templates
            </h2>
            <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Launch pre-configured spaces with realistic dimensions, doors, and furniture presets.
            </p>
          </div>
          <RouterLink
            to="/projects"
            class="text-sm font-semibold text-teal-800 hover:underline dark:text-teal-400"
          >
            Browse all saved projects →
          </RouterLink>
        </div>

        <div class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <!-- Template 1: Conference Hall -->
          <div
            class="group relative flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div>
              <div class="flex items-center justify-between">
                <span
                  class="rounded-md bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                >
                  Dual-Floor
                </span>
                <span class="text-xs text-zinc-500">24 × 18 m</span>
              </div>
              <h3 class="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Conference Auditorium
              </h3>
              <p class="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Keynote stage with podium, 200 tiered attendee chairs, central aisle, and upper
                viewing gallery.
              </p>
            </div>
            <button
              type="button"
              data-testid="blueprint-conference"
              class="focus-ring mt-6 w-full rounded-lg bg-zinc-100 py-2 text-xs font-semibold text-zinc-900 hover:bg-teal-800 hover:text-white dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-teal-400 dark:hover:text-zinc-950 transition"
              @click="launchConferenceHallDemo"
            >
              Launch Blueprint
            </button>
          </div>

          <!-- Template 2: Exhibition Fair -->
          <div
            class="group relative flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div>
              <div class="flex items-center justify-between">
                <span
                  class="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                >
                  Expo Grid
                </span>
                <span class="text-xs text-zinc-500">30 × 20 m</span>
              </div>
              <h3 class="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Exhibition Trade Fair
              </h3>
              <p class="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                10 shell booths with demo counters, TV displays, registration foyer, and networking
                lounge.
              </p>
            </div>
            <button
              type="button"
              data-testid="blueprint-exhibition"
              class="focus-ring mt-6 w-full rounded-lg bg-zinc-100 py-2 text-xs font-semibold text-zinc-900 hover:bg-teal-800 hover:text-white dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-teal-400 dark:hover:text-zinc-950 transition"
              @click="launchTemplateBlueprint(exhibitionExpoRaw, 'Exhibition Trade Fair')"
            >
              Launch Blueprint
            </button>
          </div>

          <!-- Template 3: Gala & Banquet -->
          <div
            class="group relative flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div>
              <div class="flex items-center justify-between">
                <span
                  class="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                >
                  Hospitality
                </span>
                <span class="text-xs text-zinc-500">22 × 16 m</span>
              </div>
              <h3 class="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Gala Banquet &amp; Reception
              </h3>
              <p class="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                12 banquet round tables with 72 chairs, live performance stage, sound towers, and
                cocktail bar.
              </p>
            </div>
            <button
              type="button"
              data-testid="blueprint-gala"
              class="focus-ring mt-6 w-full rounded-lg bg-zinc-100 py-2 text-xs font-semibold text-zinc-900 hover:bg-teal-800 hover:text-white dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-teal-400 dark:hover:text-zinc-950 transition"
              @click="launchTemplateBlueprint(galaBanquetRaw, 'Gala Banquet & Reception')"
            >
              Launch Blueprint
            </button>
          </div>

          <!-- Template 4: Theater Stage -->
          <div
            class="group relative flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div>
              <div class="flex items-center justify-between">
                <span
                  class="rounded-md bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                >
                  Tiered Hall
                </span>
                <span class="text-xs text-zinc-500">24 × 16 m</span>
              </div>
              <h3 class="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Theater &amp; Keynote Stage
              </h3>
              <p class="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                10m raised proscenium stage, speaker podium, LED backdrop screen, 140 audience
                chairs, and AV console.
              </p>
            </div>
            <button
              type="button"
              data-testid="blueprint-theater"
              class="focus-ring mt-6 w-full rounded-lg bg-zinc-100 py-2 text-xs font-semibold text-zinc-900 hover:bg-teal-800 hover:text-white dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-teal-400 dark:hover:text-zinc-950 transition"
              @click="launchTemplateBlueprint(theaterStageRaw, 'Theater & Keynote Stage')"
            >
              Launch Blueprint
            </button>
          </div>

          <!-- Template 5: Hackathon Arena -->
          <div
            class="group relative flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div>
              <div class="flex items-center justify-between">
                <span
                  class="rounded-md bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-950 dark:text-sky-300"
                >
                  Collaborative
                </span>
                <span class="text-xs text-zinc-500">26 × 18 m</span>
              </div>
              <h3 class="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Hackathon &amp; Esports Arena
              </h3>
              <p class="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                8 team pod clusters with 48 chairs, central pitch stage, sponsor booths, and mentor
                lounge.
              </p>
            </div>
            <button
              type="button"
              data-testid="blueprint-hackathon"
              class="focus-ring mt-6 w-full rounded-lg bg-zinc-100 py-2 text-xs font-semibold text-zinc-900 hover:bg-teal-800 hover:text-white dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-teal-400 dark:hover:text-zinc-950 transition"
              @click="launchTemplateBlueprint(hackathonArenaRaw, 'Hackathon & Esports Arena')"
            >
              Launch Blueprint
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Bento Grid of Architectural Capabilities -->
    <section class="py-16 sm:py-24">
      <div class="mx-auto max-w-[90rem] px-4 sm:px-6">
        <div class="text-center">
          <p class="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400">
            Engineered for Event Planners &amp; Architects
          </p>
          <h2
            class="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50"
          >
            Everything you need to design spaces at scale
          </h2>
          <p class="mx-auto mt-3 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            Built from scratch on Web standards without heavyweight proprietary formats or mandatory
            subscriptions.
          </p>
        </div>

        <div class="mt-12 grid gap-6 md:grid-cols-3">
          <!-- Card 1 -->
          <div
            class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div
              class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                />
              </svg>
            </div>
            <h3 class="mt-4 text-base font-semibold">Sub-centimeter Geometry</h3>
            <p class="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Precise wall junctions, perimeter length tags, and automatic room area calculation.
              Snap precisely to orthogonal grids and existing corners.
            </p>
          </div>

          <!-- Card 2 -->
          <div
            class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div
              class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"
                />
              </svg>
            </div>
            <h3 class="mt-4 text-base font-semibold">High-FPS 3D Engine</h3>
            <p class="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Three.js instanced rendering engineered to handle thousands of chairs and tables at a
              buttery 60 FPS. Soft shadow simulation with Simple and High modes.
            </p>
          </div>

          <!-- Card 3 -->
          <div
            class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div
              class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h3 class="mt-4 text-base font-semibold">Automated Egress &amp; Capacity</h3>
            <p class="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Real-time warnings for missing exits, furniture collisions, and inadequate passage
              widths. Instant capacity estimation based on room square meterage.
            </p>
          </div>

          <!-- Card 4 -->
          <div
            class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div
              class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 class="mt-4 text-base font-semibold">30+ Verified 3D Assets</h3>
            <p class="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Standardized, Apache-2.0 licensed seating, tables, booths, AV production consoles,
              safety signage, and custom drag-and-drop GLB support.
            </p>
          </div>

          <!-- Card 5 -->
          <div
            class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div
              class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 class="mt-4 text-base font-semibold">100% Local-First Privacy</h3>
            <p class="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Your venue floor plans belong exclusively to you. No server uploads required;
              IndexedDB autosaves continuously with instant crash recovery.
            </p>
          </div>

          <!-- Card 6 -->
          <div
            class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div
              class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </div>
            <h3 class="mt-4 text-base font-semibold">Universal Export Suite</h3>
            <p class="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Generate one-page printable PDF packets, high-resolution vector SVGs, PNGs, venue.json
              documents, and 3D GLBs in seconds.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Step-by-Step Workflow Section -->
    <section
      class="border-t border-zinc-200 bg-zinc-50/60 py-16 dark:border-zinc-800 dark:bg-zinc-950/40"
    >
      <div class="mx-auto max-w-[90rem] px-4 sm:px-6">
        <div class="text-center">
          <p class="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400">
            Simple 4-Step Process
          </p>
          <h2
            class="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50"
          >
            How OpenVenue Works
          </h2>
        </div>

        <div class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div
            class="relative rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <span class="text-3xl font-extrabold text-teal-800/20 dark:text-teal-400/20">01</span>
            <h3 class="mt-2 text-base font-semibold">Draw the Shell</h3>
            <p class="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Specify hall width, depth, and ceiling height. Draw internal partition walls, rooms,
              and entry doors.
            </p>
          </div>
          <div
            class="relative rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <span class="text-3xl font-extrabold text-teal-800/20 dark:text-teal-400/20">02</span>
            <h3 class="mt-2 text-base font-semibold">Arrange Assets</h3>
            <p class="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Search the 3D catalogue and drop tables, seating clusters, stages, and interactive
              zone triggers into place.
            </p>
          </div>
          <div
            class="relative rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <span class="text-3xl font-extrabold text-teal-800/20 dark:text-teal-400/20">03</span>
            <h3 class="mt-2 text-base font-semibold">Inspect &amp; Walk</h3>
            <p class="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Switch seamlessly between plan, 3D orbit, and first-person WASD walk mode to test
              sightlines and flow.
            </p>
          </div>
          <div
            class="relative rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <span class="text-3xl font-extrabold text-teal-800/20 dark:text-teal-400/20">04</span>
            <h3 class="mt-2 text-base font-semibold">Export &amp; Share</h3>
            <p class="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Download clean PDFs for permits, JSON for live venue synchronization, and GLBs for
              rendering teams.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ Accordion Section -->
    <section class="py-16 sm:py-24">
      <div class="mx-auto max-w-4xl px-4 sm:px-6">
        <div class="text-center">
          <h2
            class="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50"
          >
            Frequently Asked Questions
          </h2>
          <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Answers to common questions about storage, formats, and browser performance.
          </p>
        </div>

        <div class="mt-10 space-y-3">
          <div
            v-for="(faq, index) in faqs"
            :key="faq.question"
            class="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
          >
            <button
              type="button"
              class="focus-ring flex w-full items-center justify-between p-4 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100"
              @click="toggleFaq(index)"
            >
              <span>{{ faq.question }}</span>
              <svg
                class="h-4 w-4 shrink-0 transition-transform duration-200"
                :class="openFaqIndex === index ? 'rotate-180 text-teal-600' : 'text-zinc-400'"
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
            <div
              v-show="openFaqIndex === index"
              class="border-t border-zinc-100 px-4 pt-2 pb-4 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800 dark:text-zinc-400"
            >
              {{ faq.answer }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Bottom CTA Banner -->
    <section
      class="border-t border-zinc-200 bg-zinc-900 py-16 text-white dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div class="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <h2 class="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Start designing your event space today
        </h2>
        <p class="mx-auto mt-4 max-w-xl text-sm text-zinc-300">
          No sign-up required to get started. Open the studio, lay out your floor plan, and inspect
          your venue in 3D right in your browser.
        </p>
        <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
          <RouterLink
            to="/projects"
            class="focus-ring inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-400 px-6 text-sm font-semibold text-zinc-950 hover:bg-teal-300 shadow-md transition"
          >
            Open Venue Studio
          </RouterLink>
          <RouterLink
            to="/signup"
            class="focus-ring inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 px-5 text-sm font-semibold text-white hover:bg-zinc-700 transition"
          >
            Create Free Account
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- Global Footer -->
    <SiteFooter />
  </div>
</template>
