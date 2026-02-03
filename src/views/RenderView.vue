<template>
  <div class="render-view">
    <!-- 顶部栏：标题 + 同步按钮 -->
    <div class="render-header">
      <h2 class="header-title">Render 项目列表</h2>
      <button
        class="sync-btn"
        :disabled="loading || !isUtoolsEnv"
        @click="syncData"
      >
        <span v-if="loading" class="loading-icon"></span>
        {{ loading ? "同步中..." : "同步数据" }}
      </button>
    </div>

    <!-- 环境提示（优化判断逻辑） -->
    <div v-if="!isUtoolsEnv" class="env-tip">
      <span class="tip-icon">⚠️</span>
      <span class="tip-text"
        >请在 Utools 中加载插件后使用此功能（当前为浏览器环境，无 preload
        支持）</span
      >
    </div>

    <!-- utoolsApi 未就绪提示 -->
    <div v-if="isUtoolsEnv && !utoolsApiReady" class="env-tip">
      <span class="tip-icon">⚠️</span>
      <span class="tip-text"
        >Utools 插件预加载模块未就绪，请重新加载插件或检查 preload.js 配置</span
      >
    </div>

    <!-- 数据展示区域（根据真实数据结构优化） -->
    <div class="render-content">
      <div v-if="loading" class="loading">
        <span class="loading-spinner"></span>
        <span class="loading-text">加载中...</span>
      </div>
      <div v-else-if="!list.length && hasLoaded" class="empty">
        <span class="empty-icon">🌐</span>
        <p>暂无 Render 项目数据</p>
        <button
          class="empty-reload-btn"
          @click="loadData"
          :disabled="!isUtoolsEnv"
        >
          重新加载
        </button>
      </div>
      <ul v-else class="data-list">
        <!-- 适配真实数据结构：item 是外层对象，service 是核心数据 -->
        <li
          v-for="(item, index) in list"
          :key="item.service?.id || index"
          class="list-item"
        >
          <div class="item-header">
            <span class="item-name">{{
              item.service?.name || "未命名项目"
            }}</span>
            <span class="item-type-tag">{{
              item.service?.type || "未知类型"
            }}</span>
          </div>

          <!-- 分支信息 -->
          <div v-if="item.service?.branch" class="item-branch">
            <span class="desc-label">分支：</span>
            {{ item.service.branch }}
          </div>

          <!-- 仓库地址 -->
          <div v-if="item.service?.repo" class="item-repo">
            <span class="desc-label">仓库：</span>
            <a
              :href="item.service.repo"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ item.service.repo }}
              <span class="link-icon">↗</span>
            </a>
          </div>

          <!-- 访问地址 -->
          <div v-if="item.service?.url" class="item-url">
            <span class="url-label">访问地址：</span>
            <a
              :href="item.service.url"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ item.service.url }}
              <span class="link-icon">↗</span>
            </a>
          </div>

          <!-- 控制台地址 -->
          <div v-if="item.service?.dashboardUrl" class="item-dashboard">
            <span class="desc-label">控制台：</span>
            <a
              :href="item.service.dashboardUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ item.service.dashboardUrl }}
              <span class="link-icon">↗</span>
            </a>
          </div>

          <!-- 运行环境和计划 -->
          <div v-if="item.service?.serviceDetails" class="item-details">
            <span class="desc-label">配置：</span>
            {{ item.service.serviceDetails.runtime || "未知环境" }} /
            {{ item.service.serviceDetails.plan || "未知计划" }}
          </div>

          <!-- 创建和更新时间 -->
          <div class="item-time">
            <span class="desc-label">创建时间：</span>
            {{ formatTime(item.service?.createdAt) }}
            <span v-if="item.service?.updatedAt" class="update-time">
              | 更新时间：{{ formatTime(item.service.updatedAt) }}
            </span>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import { usePiniaHelper } from "@/utils/piniaHelper";
import getLatestConfig from "@/utils/get-config";

const projectsHelper = usePiniaHelper("projects");

const loading = ref(false);
const list = ref([]);
const hasLoaded = ref(false);

const isUtoolsEnv = ref(false);
const utoolsApiReady = ref(false);
let renderToken = ref("");

// 格式化时间函数
const formatTime = (timeStr) => {
  if (!timeStr) return "未知";
  try {
    const date = new Date(timeStr);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch (e) {
    return timeStr;
  }
};

// 检测 Utools 环境
const checkUtoolsEnv = () => {
  isUtoolsEnv.value = typeof utools !== "undefined";

  // 检查 window.utoolsApi 是否存在
  if (window.utoolsApi && typeof window.utoolsApi.test === "function") {
    utoolsApiReady.value = true;
    console.log("[页面] utoolsApi 已就绪");
  } else {
    utoolsApiReady.value = false;
    console.error("[页面] utoolsApi 未挂载，请检查控制台 preload 报错");
  }
};

// 监听 utoolsApiReady 变化
watch(utoolsApiReady, (newVal) => {
  if (isUtoolsEnv.value && !newVal) {
    console.warn("[页面] Utools 环境存在，但 utoolsApi 未挂载，请检查：");
    console.warn("1. preload.js 是否在 plugin.json 中正确配置");
    console.warn("2. preload.js 是否有语法错误");
    console.warn("3. 插件是否已重新加载");
  }
});

// 加载数据逻辑
const loadData = async (force = false) => {
  if (!isUtoolsEnv.value) {
    return;
  }

  // 先调用测试接口验证
  if (!utoolsApiReady.value || !window.utoolsApi?.test) {
    alert(
      "Utools 插件预加载模块未就绪，请：\n1. 右键插件 → 重新加载插件\n2. 检查 preload.js 是否有语法错误\n3. 确认 plugin.json 中 preload 路径正确"
    );
    return;
  }

  // 测试接口调用
  try {
    const testRes = window.utoolsApi.test();
    if (!testRes.success) {
      alert(`预加载模块异常：${testRes.message}`);
      return;
    }
  } catch (e) {
    alert(`预加载模块调用失败：${e.message}`);
    return;
  }

  const cacheList = await projectsHelper.get("getRenderedProjects");
  if (cacheList.length && !force) {
    list.value = cacheList;
    return;
  }

  loading.value = true;
  hasLoaded.value = true;
  try {
    const res = await window.utoolsApi.getRenderProjects(renderToken.value);
    if (res.success) {
      list.value = res.data;
      await projectsHelper.set("updateRenderedProjects", list.value);
    } else {
      alert(`加载失败：${res.message}`);
    }
  } catch (error) {
    alert(`加载异常：${error.message}`);
    console.error("Render 项目加载异常：", error);
  } finally {
    loading.value = false;
  }
};

const syncData = async () => {
  await loadData(true);
};

onMounted(async () => {
  const config = await getLatestConfig();
  renderToken.value = config.renderApiToken;
  // 延迟 100ms 再检测，给 preload 足够的挂载时间
  await new Promise((resolve) => setTimeout(resolve, 100));
  await checkUtoolsEnv();
  await loadData();
});
</script>

<style scoped>
/* 优化后的样式 */
.render-view {
  min-height: 100%;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%);
}

.render-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  margin-bottom: 24px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.render-header:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}

.header-title {
  margin: 0;
  font-size: 24px;
  color: #2c3e50;
  font-weight: 700;
  background: linear-gradient(135deg, #4361ee 0%, #7209b7 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.sync-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #4361ee 0%, #7209b7 100%);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(67, 97, 238, 0.3);
}

.sync-btn:disabled {
  background: linear-gradient(135deg, #a0a8d0 0%, #c7b8e0 100%);
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.sync-btn:not(:disabled):hover {
  background: linear-gradient(135deg, #3a56d4 0%, #5a0887 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(67, 97, 238, 0.4);
}

.loading-icon {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.env-tip {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #fff7e6 0%, #ffedd5 100%);
  border: 1px solid #ffd591;
  border-radius: 10px;
  color: #fa8c16;
  font-size: 14px;
  margin-bottom: 24px;
  box-shadow: 0 4px 12px rgba(250, 140, 22, 0.1);
}

.tip-icon {
  font-size: 20px;
  line-height: 1;
}

.tip-text {
  flex: 1;
  line-height: 1.5;
  font-weight: 500;
}

.render-content {
  border-radius: 16px;
  background-color: #ffffff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.3s ease;
}

.render-content:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 100px 0;
  color: #666;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.loading-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #e0e0e0;
  border-top: 3px solid #4361ee;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  font-size: 16px;
  font-weight: 500;
  color: #495057;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 20px;
  text-align: center;
  color: #999;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 24px;
  opacity: 0.8;
  transition: all 0.3s ease;
}

.empty:hover .empty-icon {
  transform: scale(1.1) rotate(10deg);
}

.empty p {
  margin: 0 0 24px 0;
  font-size: 16px;
  color: #6c757d;
  max-width: 400px;
  line-height: 1.6;
}

.empty-reload-btn {
  padding: 10px 24px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
  color: #4361ee;
  border: 1px solid #d9e0ff;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.empty-reload-btn:disabled {
  color: #999;
  cursor: not-allowed;
  background: linear-gradient(135deg, #f9f9f9 0%, #e9ecef 100%);
  box-shadow: none;
}

.empty-reload-btn:not(:disabled):hover {
  background: linear-gradient(135deg, #eef0ff 0%, #d9e0ff 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(67, 97, 238, 0.2);
}

.data-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.list-item {
  padding: 24px;
  border-bottom: 1px solid #f5f5f5;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.list-item:last-child {
  border-bottom: none;
}

.list-item:hover {
  background-color: #f8f9fa;
  transform: translateX(8px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.list-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 4px;
  background: linear-gradient(135deg, #4361ee 0%, #7209b7 100%);
  transform: scaleY(0);
  transition: transform 0.3s ease;
}

.list-item:hover::before {
  transform: scaleY(1);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.item-name {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 10px;
}

.item-name::before {
  content: '🌐';
  font-size: 16px;
}

.item-type-tag {
  padding: 4px 12px;
  background: linear-gradient(135deg, #e8f4ff 0%, #d9e0ff 100%);
  color: #4361ee;
  font-size: 12px;
  border-radius: 20px;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(67, 97, 238, 0.15);
}

/* 优化字段展示样式 */
.item-branch,
.item-repo,
.item-url,
.item-dashboard,
.item-details,
.item-time {
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background-color: #f8f9fa;
  border-left: 3px solid #d9e0ff;
}

.desc-label,
.url-label {
  color: #999;
  margin-right: 6px;
  font-weight: 500;
}

.item-branch,
.item-details,
.item-time {
  color: #666;
}

.item-repo,
.item-url,
.item-dashboard {
  color: #4361ee;
}

.item-repo a,
.item-dashboard a,
.item-url a {
  color: #4361ee;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.item-repo a:hover,
.item-dashboard a:hover,
.item-url a:hover {
  text-decoration: underline;
  transform: translateX(2px);
}

.update-time {
  color: #888;
  font-size: 13px;
  margin-left: 12px;
  padding-left: 12px;
  border-left: 1px solid #e9ecef;
}

.link-icon {
  font-size: 12px;
  line-height: 1;
  transition: transform 0.2s ease;
}

.item-repo a:hover .link-icon,
.item-dashboard a:hover .link-icon,
.item-url a:hover .link-icon {
  transform: rotate(45deg);
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .render-view {
    padding: 16px;
  }
  
  .render-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 16px;
  }
  
  .header-title {
    font-size: 20px;
  }
  
  .sync-btn {
    padding: 10px 20px;
    font-size: 14px;
  }
  
  .list-item {
    padding: 20px;
  }
  
  .list-item:hover {
    transform: translateX(4px);
  }
  
  .item-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .item-name {
    font-size: 16px;
  }
  
  .item-branch,
  .item-repo,
  .item-url,
  .item-dashboard,
  .item-details,
  .item-time {
    font-size: 13px;
    padding: 6px 10px;
  }
  
  .update-time {
    margin-left: 8px;
    padding-left: 8px;
  }
}

@media (max-width: 480px) {
  .render-header {
    padding: 12px;
  }
  
  .header-title {
    font-size: 18px;
  }
  
  .sync-btn {
    padding: 8px 16px;
    font-size: 13px;
  }
  
  .list-item {
    padding: 16px;
  }
}
</style>