import { createRouter, createWebHistory } from "vue-router";
import ProjectsView from "./views/ProjectsView.vue";
import WorkspaceView from "./views/WorkspaceView.vue";

export const routes = [
  { path: "/", name: "projects", component: ProjectsView },
  { path: "/projects/:projectId", name: "project", component: WorkspaceView },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
