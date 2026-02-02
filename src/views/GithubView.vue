<template>
  <div class="github-view">
    <!-- 新增顶部栏 + 同步按钮 -->
    <div class="github-header">
      <h2 class="header-title">GitHub 仓库列表</h2>
      <button class="sync-btn" :disabled="loading" @click="syncData">
        <span v-if="loading" class="loading-icon"></span>
        {{ loading ? "同步中..." : "同步数据" }}
      </button>
    </div>

    <!-- 原有内容区域优化样式 -->
    <div class="github-content">
      <div v-if="loading" class="loading">
        <span class="loading-spinner"></span>
        <span class="loading-text">加载中...</span>
      </div>
      <div v-else-if="!list.length" class="empty">
        <span class="empty-icon">📦</span>
        <p>暂无 GitHub 仓库数据</p>
        <button class="empty-reload-btn" @click="loadData">重新加载</button>
      </div>
      <ul v-else class="data-list">
        <li v-for="(item, index) in list" :key="index" class="list-item">
          <div class="item-name">{{ item.name }}</div>
          <div v-if="item.description" class="item-desc">
            {{ item.description }}
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { getGithubRepos } from "@/utils/api";
import { usePiniaHelper } from "@/utils/piniaHelper";

// 初始化 projects 仓库的工具函数
const projectsHelper = usePiniaHelper("projects");
const loading = ref(false);
const list = ref([]);
const cacheList = ref([]);

// 加载数据
const loadData = async (force = false) => {
  const cacheList = await projectsHelper.get("getGithubProjects");
  if (cacheList.length && !force) {
    list.value = cacheList;
    return;
  }

  loading.value = true;
  const res = await getGithubRepos();
  if (res.success) {
    list.value = res.data.map((item) => ({
      name: item.name,
      description: item.description,
    }));
    await projectsHelper.set("updateGithubProjects", list.value);
  } else {
    alert(`加载失败：${res.message}`);
  }
  loading.value = false;
};

const syncData = async () => {
  await loadData(true);
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.github-view {
  min-height: 100%;
  margin: 0px auto;
  padding: 10px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* 顶部栏样式 */
.github-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  margin-bottom: 20px;
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
  background-color: #409eff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.sync-btn:disabled {
  background-color: #a0cfff;
  cursor: not-allowed;
}

.sync-btn:not(:disabled):hover {
  background-color: #337ecc;
}

.loading-icon {
  width: 14px;
  height: 14px;
  border: 2px solid transparent;
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* 内容区域样式 */
.github-content {
  border-radius: 8px;
  background-color: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

/* 加载状态样式 */
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
  border-top: 2px solid #409eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  font-size: 14px;
}

/* 空状态样式 */
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
  padding: 6px 12px;
  background-color: #f5f7fa;
  color: #409eff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s ease;
}

.empty-reload-btn:hover {
  background-color: #eef2f7;
}

/* 列表样式 */
.data-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.list-item {
  padding: 16px 20px;
  border-bottom: 1px solid #f5f5f5;
  transition: background-color 0.2s ease;
}

.list-item:last-child {
  border-bottom: none;
}

.list-item:hover {
  background-color: #f8f9fa;
}

.item-name {
  font-size: 15px;
  font-weight: 500;
  color: #2c3e50;
  margin-bottom: 4px;
}

.item-desc {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
  max-width: 100%;
  word-wrap: break-word;
}

/* 旋转动画 */
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 响应式适配 */
@media (max-width: 768px) {
  .github-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .list-item {
    padding: 12px 16px;
  }
}
</style>