import { createApp } from "vue";
import App from "./App.vue";
import router from "./routes";
import { createPinia } from 'pinia'
const pinia = createPinia()
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
pinia.use(piniaPluginPersistedstate) // 注册插件



// 挂载应用
createApp(App).use(router).use(pinia).mount("#app");

// Utools 初始化（适配 Utools 环境）
if (window.utools) {
  // 设置 Utools 插件的退出事件
  utools.onPluginOut(() => {
    console.log("插件退出");
  });
  // 设置 Utools 窗口大小
  utools.setExpendHeight(600);
}
