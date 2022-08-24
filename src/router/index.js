import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
// import ThreeDView from "../views/ThreeDView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/bim",
      name: "bim",
      // component: HomeView
      // component: ThreeDView
      component: () => import("../views/ThreeDViewBIM.vue"),
    },
    {
      path: "/varema",
      name: "varema",
      // component: HomeView
      // component: ThreeDView
      component: () => import("../views/ThreeDViewVarema.vue"),
    },
    {
      path: "/",
      name: "home",
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import("../views/AboutView.vue"),
    },
  ],
});

export default router;
