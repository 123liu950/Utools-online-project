import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/github",
      name: "github",
      component: () => import("@/views/GithubView.vue"),
    },
    {
      path: "/npm",
      name: "npm",
      component: () => import("@/views/NpmView.vue"),
    },
    {
      path: "/render",
      name: "render",
      component: () => import("@/views/RenderView.vue"),
    },
    {
      path: "/local",
      name: "local",
      component: () => import("@/views/LocalView.vue"),
    },
    {
      path: "/",
      name: "settings",
      component: () => import("@/views/SettingsView.vue"),
    },
  ],
});

export default router;
