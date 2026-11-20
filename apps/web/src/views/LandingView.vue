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

const blueprints = [
  {
    testId: "blueprint-conference",
    name: "Conference Auditorium",
    size: "24 × 18 m",
    copy: "Keynote stage, podium, and seating for a dual-floor hall.",
    run: () => launchConferenceHallDemo(),
  },
  {
    testId: "blueprint-exhibition",
    name: "Exhibition Trade Fair",
    size: "30 × 20 m",
    copy: "Shell booths, demo counters, and a networking lounge.",
    run: () => launchTemplateBlueprint(exhibitionExpoRaw, "Exhibition Trade Fair"),
  },
  {
    testId: "blueprint-gala",
    name: "Gala Banquet & Reception",
    size: "22 × 16 m",
    copy: "Banquet rounds, stage, and hospitality service zones.",
    run: () => launchTemplateBlueprint(galaBanquetRaw, "Gala Banquet & Reception"),
  },
  {
    testId: "blueprint-theater",
    name: "Theater & Keynote Stage",
    size: "24 × 16 m",
    copy: "Raised proscenium, audience rake, and AV console.",
    run: () => launchTemplateBlueprint(theaterStageRaw, "Theater & Keynote Stage"),
  },
  {
    testId: "blueprint-hackathon",
    name: "Hackathon & Esports Arena",
    size: "26 × 18 m",
    copy: "Team pods, pitch stage, and mentor lounge.",
    run: () => launchTemplateBlueprint(hackathonArenaRaw, "Hackathon & Esports Arena"),
  },
];
</script>

<template>
  <div>
    <section class="hero-stage">
      <div class="hero-media" aria-hidden="true">
        <img :src="hallStill" alt="" />
      </div>
      <div class="hero-veil" aria-hidden="true" />
      <div class="hero-copy mx-auto w-full max-w-[90rem]">
        <div class="max-w-3xl">
          <p class="hero-brand">OpenVenue</p>
          <h1 class="sr-only">Architectural Precision. Instant 3D. Event Spaces Built Locally.</h1>
          <p class="hero-lede">
            Architectural Precision. Instant 3D. Draft exhibition halls and auditoriums in the
            browser — plan, walk, and export without cloud lock-in.
          </p>
          <div class="hero-actions">
            <RouterLink to="/projects" data-testid="open-editor" class="btn btn-primary">
              Launch Venue Studio
            </RouterLink>
            <button
              type="button"
              data-testid="hero-demo-button"
              class="btn btn-secondary"
              @click="launchConferenceHallDemo"
            >
              Explore Live Demo
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="section page-grid">
      <div class="mx-auto max-w-[90rem] px-4 sm:px-6">
        <h2 class="section-title">See the hall from every angle</h2>
        <p class="section-copy">
          Switch between drafting, orbit, walk, and cutaway without leaving the same scene.
        </p>

        <div class="mt-8 overflow-hidden surface" style="border-radius: 1.1rem">
          <div
            class="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3"
            style="
              border-color: var(--line);
              background: color-mix(in srgb, var(--paper) 70%, transparent);
            "
          >
            <p class="font-mono text-xs" style="color: var(--ink-soft)">
              conference-hall.venue.json
            </p>
            <div class="flex flex-wrap gap-1">
              <button
                v-for="tab in [
                  { id: 'plan', label: '2D Floor Plan' },
                  { id: '3d', label: '3D Hall' },
                  { id: 'walk', label: 'WASD Walk' },
                  { id: 'map', label: 'Cutaway Map' },
                ] as const"
                :key="tab.id"
                type="button"
                class="btn-segment"
                :class="activeTab === tab.id ? 'btn-segment-active' : 'btn-segment-idle'"
                @click="activeTab = tab.id"
              >
                {{ tab.label }}
              </button>
            </div>
          </div>

          <div class="relative bg-[#081216]">
            <img
              :src="hallStill"
              alt="Plan, 3D hall, and walk toward stage"
              class="max-h-[28rem] w-full object-cover"
            />
            <div
              class="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-4 sm:p-5"
              style="background: linear-gradient(transparent, rgba(5, 10, 13, 0.9))"
            >
              <div class="max-w-xl text-left text-[#edf4f6]">
                <p class="text-sm font-semibold">
                  <span v-if="activeTab === 'plan'">2D Vector Editor: Sub-centimeter Snapping</span>
                  <span v-else-if="activeTab === '3d'"
                    >3D Real-time View: Orbit, Isometric &amp; Materials</span
                  >
                  <span v-else-if="activeTab === 'walk'"
                    >First-Person Walk: WASD Physical Collision</span
                  >
                  <span v-else>Multi-level Cutaway: Isolated Floor Plates</span>
                </p>
                <p class="mt-1 text-xs" style="color: rgba(237, 244, 246, 0.72)">
                  <span v-if="activeTab === 'plan'"
                    >Draw walls, rooms, doors and furniture with automated dimension overlays.</span
                  >
                  <span v-else-if="activeTab === '3d'"
                    >Orbit the hall, then move and scale furniture with 3D gizmos.</span
                  >
                  <span v-else-if="activeTab === 'walk'"
                    >Walk the venue as an attendee before construction day.</span
                  >
                  <span v-else>Inspect floors as separated plates and isolate any level.</span>
                </p>
              </div>
              <button
                type="button"
                class="btn btn-primary min-h-9 px-3 text-xs"
                @click="launchConferenceHallDemo"
              >
                Open This Hall
              </button>
            </div>
          </div>
        </div>

        <ul
          class="mt-8 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4"
          style="color: var(--ink-soft)"
        >
          <li>60 FPS Three.js Engine</li>
          <li>Sub-millimeter Snapping</li>
          <li>IndexedDB Offline Persistence</li>
          <li>Export to JSON, PDF &amp; GLB</li>
        </ul>
      </div>
    </section>

    <section
      class="section"
      style="background: color-mix(in srgb, var(--paper-raised) 80%, transparent)"
    >
      <div class="mx-auto max-w-[90rem] px-4 sm:px-6">
        <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 class="section-title">Start from a blueprint</h2>
            <p class="section-copy">Open a finished hall, then reshape it for your event.</p>
          </div>
          <RouterLink to="/projects" class="btn btn-ghost text-sm font-semibold">
            Browse projects →
          </RouterLink>
        </div>

        <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <article
            v-for="item in blueprints"
            :key="item.testId"
            class="flex flex-col justify-between p-5 surface-quiet"
            style="border-radius: 1rem"
          >
            <div>
              <p class="text-xs" style="color: var(--ink-soft)">{{ item.size }}</p>
              <h3 class="mt-3 text-base font-semibold">{{ item.name }}</h3>
              <p class="mt-2 text-sm" style="color: var(--ink-soft)">{{ item.copy }}</p>
            </div>
            <button
              type="button"
              :data-testid="item.testId"
              class="btn btn-secondary mt-6 min-h-10 w-full text-xs"
              @click="item.run()"
            >
              Launch Blueprint
            </button>
          </article>
        </div>
      </div>
    </section>

    <section class="section page-grid">
      <div class="mx-auto max-w-[90rem] px-4 sm:px-6">
        <h2 class="section-title">Built for planners who draft first</h2>
        <p class="section-copy">
          One local document powers the plan, the hall, and the visitor walk.
        </p>
        <div class="mt-10 grid gap-8 md:grid-cols-3">
          <div>
            <h3 class="text-lg font-semibold">Plan with snap and clearance</h3>
            <p class="mt-2 text-sm" style="color: var(--ink-soft)">
              Walls, rooms, doors, and furniture stay on a measured grid with capacity checks.
            </p>
          </div>
          <div>
            <h3 class="text-lg font-semibold">Stage the hall in 3D</h3>
            <p class="mt-2 text-sm" style="color: var(--ink-soft)">
              Orbit, isometric, and walk modes share the same venue.json scene.
            </p>
          </div>
          <div>
            <h3 class="text-lg font-semibold">Keep work on this device</h3>
            <p class="mt-2 text-sm" style="color: var(--ink-soft)">
              Autosave into IndexedDB. Export when you need JSON, PDF, or GLB.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 class="section-title text-center">Questions</h2>
        <div class="mt-8 divide-y" style="border-color: var(--line)">
          <div
            v-for="(faq, index) in faqs"
            :key="faq.question"
            class="border-t py-4"
            style="border-color: var(--line)"
          >
            <button
              type="button"
              class="flex w-full items-start justify-between gap-4 text-left text-sm font-semibold"
              @click="toggleFaq(index)"
            >
              <span>{{ faq.question }}</span>
              <span aria-hidden="true">{{ openFaqIndex === index ? "−" : "+" }}</span>
            </button>
            <p v-if="openFaqIndex === index" class="mt-3 text-sm" style="color: var(--ink-soft)">
              {{ faq.answer }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <SiteFooter />
  </div>
</template>
