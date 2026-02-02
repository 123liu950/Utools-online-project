// src/stores/projects.js
import { defineStore } from "pinia";

export const useProjectsStore = defineStore("projects", {
  persist: true, // 开启数据持久化
  persist: {
    enabled: true,
    key: 'grande-projects',
  },
  state: () => ({
    githubProjects: [],
    npmProjects: [],
    renderedProjects: [],
    localProjects: [],
  }),
  getters: {
    // 重命名 getters，避免和 state 重名
    getRenderedProjects: (state) => state.renderedProjects,
    getLocalProjects: (state) => state.localProjects,
    getGithubProjects: (state) => state.githubProjects,
    getNpmProjects: (state) => state.npmProjects,
  },
  actions: {
    updateRenderedProjects(newProjects) {
      this.renderedProjects = newProjects;
    },
    updateLocalProjects(newProjects) {
      this.localProjects = newProjects;
    },
    updateGithubProjects(newProjects) {
      this.githubProjects = newProjects;
    },
    updateNpmProjects(newProjects) {
      this.npmProjects = newProjects;
    },
  },
});
