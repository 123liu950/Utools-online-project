// src/utils/piniaHelper.js
import { storeToRefs } from "pinia";

// 修复动态导入的写法：确保解构出正确的仓库函数
const storeMap = {
  projects: async () => {
    const mod = await import("@/stores/projects");
    // 确认 mod 中有 useProjectsStore 函数（打印调试）
    // console.log("仓库模块导出：", mod);
    return mod.useProjectsStore;
  },
  config: async () => {
    const mod = await import("@/stores/config");
    return mod.useConfigStore;
  },
};

export const usePiniaHelper = (storeName) => {
  if (!storeMap[storeName]) {
    throw new Error(
      `Pinia 仓库【${storeName}】未在 storeMap 中注册，请先添加！`,
    );
  }

  let storeInstance = null;

  const initStore = async () => {
    if (!storeInstance) {
      // 先获取仓库创建函数，再执行创建实例
      const useStore = await storeMap[storeName]();
      // 再次校验：确保 useStore 是函数
      if (typeof useStore !== "function") {
        throw new Error(`仓库【${storeName}】的创建方法不是函数，请检查导出！`);
      }
      storeInstance = useStore();
    }
    return storeInstance;
  };

  return {
    async get(key) {
      const store = await initStore();
      if (!Object.prototype.hasOwnProperty.call(store, key)) {
        throw new Error(
          `仓库【${storeName}】中不存在【${key}】（state/getters）！`,
        );
      }
      const refs = storeToRefs(store);
      return refs[key]?.value ?? store[key];
    },

    async set(actionName, value) {
      const store = await initStore();
      if (typeof store[actionName] !== "function") {
        throw new Error(
          `仓库【${storeName}】中不存在 actions【${actionName}】，或该字段不是函数！`,
        );
      }
      await store[actionName](value);
    },
  };
};
