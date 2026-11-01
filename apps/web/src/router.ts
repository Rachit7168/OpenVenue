import { createRouter, createWebHistory } from "vue-router";
import BenchmarkView from "./views/BenchmarkView.vue";
import GuideView from "./views/GuideView.vue";
import LandingView from "./views/LandingView.vue";
import ProjectsView from "./views/ProjectsView.vue";
import WorkspaceView from "./views/WorkspaceView.vue";

export const routes = [
  { path: "/", name: "landing", component: LandingView },
  { path: "/projects", name: "projects", component: ProjectsView },
  { path: "/guide", name: "guide", component: GuideView },
  { path: "/benchmark", name: "benchmark", component: BenchmarkView },
  { path: "/projects/:projectId", name: "project", component: WorkspaceView },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
