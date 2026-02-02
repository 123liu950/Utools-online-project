<template>
  <div class="render-view">
    <button @click="windowReload">重新加载</button>
    <!-- 顶部栏：标题 + 同步按钮 -->
    <div class="render-header">
      <h2 class="header-title">Render 项目列表</h2>
      <button
        class="sync-btn"
        :disabled="loading || !renderToken || !isUtoolsEnv"
        @click="syncData"
      >
        <span v-if="loading" class="loading-icon"></span>
        {{ loading ? "同步中..." : "同步数据" }}
      </button>
    </div>

    <!-- Token 配置区域（优化样式） -->
    <div class="token-config">
      <div class="input-wrapper">
        <label class="input-label">Render API Token</label>
        <input
          type="text"
          v-model="renderToken"
          placeholder="请输入 Render API Token（必填）"
          class="token-input"
        />
      </div>
      <button
        @click="loadData"
        class="load-btn"
        :disabled="loading || !isUtoolsEnv"
      >
        {{ loading ? "加载中..." : "加载项目" }}
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
          :disabled="!renderToken || !isUtoolsEnv"
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

const projectsHelper = usePiniaHelper("projects");

const renderToken = ref("");
const loading = ref(false);
const list = ref([]);
const hasLoaded = ref(false);

const isUtoolsEnv = ref(false);
const utoolsApiReady = ref(false);

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
    alert("请在 Utools 中加载插件后使用此功能！");
    return;
  }

  if (!renderToken.value) {
    alert("请输入 Render API Token！");
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

const windowReload = () => {
  window.location.reload();
};

onMounted(async () => {
  // 延迟 100ms 再检测，给 preload 足够的挂载时间
  await new Promise((resolve) => setTimeout(resolve, 100));
  await checkUtoolsEnv();
});
</script>

<style scoped>
/* 原有样式保留，新增适配新字段的样式 */
.render-view {
  max-width: 1000px;
  margin: 20px auto;
  padding: 0 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.render-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  margin-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.header-title {
  margin: 0;
  font-size: 18px;
  color: #2c3e50;
  font-weight: 600;
}

.sync-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background-color: #4361ee; /* Render 主题蓝紫 */
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.sync-btn:disabled {
  background-color: #a0a8d0;
  cursor: not-allowed;
}

.sync-btn:not(:disabled):hover {
  background-color: #3a56d4;
}

.loading-icon {
  width: 14px;
  height: 14px;
  border: 2px solid transparent;
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.token-config {
  margin-bottom: 20px;
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.input-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-label {
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.token-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.token-input:focus {
  outline: none;
  border-color: #4361ee;
  box-shadow: 0 0 0 2px rgba(67, 97, 238, 0.1);
}

.load-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  background: #4361ee;
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.load-btn:disabled {
  background-color: #a0a8d0;
  cursor: not-allowed;
}

.load-btn:not(:disabled):hover {
  background-color: #3a56d4;
}

.env-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 6px;
  color: #fa8c16;
  font-size: 13px;
  margin-bottom: 20px;
}

.tip-icon {
  font-size: 16px;
  line-height: 1;
}

.tip-text {
  flex: 1;
  line-height: 1.4;
}

.render-content {
  border-radius: 8px;
  background-color: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 80px 0;
  color: #666;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e0e0e0;
  border-top: 2px solid #4361ee;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  font-size: 14px;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
  color: #999;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty p {
  margin: 0 0 20px 0;
  font-size: 14px;
}

.empty-reload-btn {
  padding: 8px 16px;
  background-color: #f5f7fa;
  color: #4361ee;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s ease;
}

.empty-reload-btn:disabled {
  color: #999;
  cursor: not-allowed;
  background-color: #f9f9f9;
}

.empty-reload-btn:not(:disabled):hover {
  background-color: #eef0ff;
}

.data-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.list-item {
  padding: 20px;
  border-bottom: 1px solid #f5f5f5;
  transition: background-color 0.2s ease;
}

.list-item:last-child {
  border-bottom: none;
}

.list-item:hover {
  background-color: #f8f9fa;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.item-name {
  font-size: 15px;
  font-weight: 600;
  color: #2c3e50;
}

.item-type-tag {
  padding: 2px 8px;
  background-color: #e8f4ff;
  color: #4361ee;
  font-size: 11px;
  border-radius: 4px;
  font-weight: 500;
}

/* 新增样式：适配新的字段展示 */
.item-branch,
.item-repo,
.item-url,
.item-dashboard,
.item-details,
.item-time {
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 6px;
}

.desc-label,
.url-label {
  color: #999;
  margin-right: 4px;
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
.item-dashboard a {
  color: #4361ee;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-repo a:hover,
.item-dashboard a:hover {
  text-decoration: underline;
}

.update-time {
  color: #888;
  font-size: 12px;
}

.link-icon {
  font-size: 10px;
  line-height: 1;
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
  .render-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .token-config {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .list-item {
    padding: 16px;
  }

  .item-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
}
</style>