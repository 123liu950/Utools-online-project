// src/stores/projects.js
import { defineStore } from "pinia";

export const useConfigStore = defineStore("config", {
  persist: true, // 开启数据持久化
  persist: {
    enabled: true,
    key: "grande-config",
  },
  state: () => ({
    configInfo: {},
  }),
  getters: {
    getConfigInfo: (state) => state.configInfo,
  },
  actions: {
    updateConfigInfo(newInfo) {
      this.configInfo = newInfo;
      console.log("更新配置信息:", this.configInfo);
    },
  },
});
