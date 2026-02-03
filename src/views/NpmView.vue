<template>
  <div class="npm-view">
    <!-- 新增顶部栏 + 同步按钮 -->
    <div class="npm-header">
      <h2 class="header-title">NPM 包列表</h2>
      <button class="sync-btn" :disabled="loading" @click="syncData">
        <span v-if="loading" class="loading-icon"></span>
        {{ loading ? "同步中..." : "同步数据" }}
      </button>
    </div>

    <!-- 原有内容区域优化样式 -->
    <div class="npm-content">
      <div v-if="loading" class="loading">
        <span class="loading-spinner"></span>
        <span class="loading-text">加载中...</span>
      </div>
      <div v-else-if="!list.length" class="empty">
        <span class="empty-icon">📦</span>
        <p>暂无 NPM 包数据</p>
        <button class="empty-reload-btn" @click="loadData">重新加载</button>
      </div>
      <ul v-else class="data-list">
        <li v-for="(item, index) in list" :key="index" class="list-item">
          <!-- 包名称和基本信息 -->
          <div class="item-header">
            <div class="item-name">
              <span class="npm-tag">npm</span>
              <a
                :href="item.package.links?.npm"
                target="_blank"
                rel="noopener noreferrer"
                class="package-link"
                >{{ item.package.name }}</a
              >
              <span class="version-tag">{{ item.package.version }}</span>
            </div>
          </div>

          <!-- 包描述 -->
          <div v-if="item.package.description" class="item-desc">
            {{ item.package.description }}
          </div>

          <!-- 包统计信息 -->
          <div class="item-stats">
            <div class="stat-item">
              <span class="stat-icon">📥</span>
              <span class="stat-text"
                >{{ item.downloads?.monthly || 0 }} 月下载</span
              >
            </div>
            <div class="stat-item">
              <span class="stat-icon">📦</span>
              <span class="stat-text">{{ item.dependents || 0 }} 依赖者</span>
            </div>
            <div class="stat-item">
              <span class="stat-icon">⭐</span>
              <span class="stat-text"
                >{{ (item.score?.final * 100).toFixed(0) }} 分</span
              >
            </div>
          </div>

          <!-- 包详情信息 -->
          <div class="item-details">
            <div class="detail-item">
              <span class="detail-label">发布者：</span>
              <span class="detail-value">{{
                item.package.publisher?.username
              }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">许可证：</span>
              <span class="detail-value">{{ item.package.license }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">发布时间：</span>
              <span class="detail-value">{{
                formatDate(item.package.date)
              }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">更新时间：</span>
              <span class="detail-value">{{ formatDate(item.updated) }}</span>
            </div>
          </div>

          <!-- 包链接 -->
          <div v-if="item.package.links" class="item-links">
            <a
              v-if="item.package.links.homepage"
              :href="item.package.links.homepage"
              target="_blank"
              rel="noopener noreferrer"
              class="link-item"
            >
              <span class="link-icon">🏠</span>
              <span class="link-text">主页</span>
            </a>
            <a
              v-if="item.package.links.repository"
              :href="handleRepository(item.package.links.repository)"
              target="_blank"
              rel="noopener noreferrer"
              class="link-item"
            >
              <span class="link-icon">📁</span>
              <span class="link-text">仓库</span>
            </a>
            <a
              v-if="item.package.links.bugs"
              :href="item.package.links.bugs"
              target="_blank"
              rel="noopener noreferrer"
              class="link-item"
            >
              <span class="link-icon">🐛</span>
              <span class="link-text">问题</span>
            </a>
            <a
              v-if="item.package.links.npm"
              :href="item.package.links.npm"
              target="_blank"
              rel="noopener noreferrer"
              class="link-item"
            >
              <span class="link-icon">📦</span>
              <span class="link-text">NPM</span>
            </a>
          </div>

          <!-- 包关键词 -->
          <div
            v-if="item.package.keywords && item.package.keywords.length"
            class="item-keywords"
          >
            <span class="keywords-label">关键词：</span>
            <span
              v-for="(keyword, idx) in item.package.keywords"
              :key="idx"
              class="keyword-tag"
              >{{ keyword }}</span
            >
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { getNpmPackages } from "@/utils/api";
import { usePiniaHelper } from "@/utils/piniaHelper";

const projectsHelper = usePiniaHelper("projects");

const loading = ref(false);
const list = ref([]);

// 加载数据
const loadData = async (force = false) => {
  const cacheList = await projectsHelper.get("getNpmProjects");
  if (cacheList.length && !force) {
    list.value = cacheList;
    return;
  }
  loading.value = true;
  const res = await getNpmPackages();
  if (res.success) {
    list.value = res.data;
    await projectsHelper.set("updateNpmProjects", list.value);
  } else {
    alert(`加载失败：${res.message}`);
  }
  loading.value = false;
};

const syncData = async () => {
  await loadData(true);
};

const handleRepository = (url) => {
  if (!url) return "";
  return url.replace(/^git\+/, "");
};

// 格式化日期函数
const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
/* 优化后的样式 */
.npm-view {
  min-height: 100%;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%);
}

/* 顶部栏样式 */
.npm-header {
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

.npm-header:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}

.header-title {
  margin: 0;
  font-size: 24px;
  color: #2c3e50;
  font-weight: 700;
  background: linear-gradient(135deg, #cb3837 0%, #a82f2e 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 同步按钮样式 */
.sync-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #cb3837 0%, #a82f2e 100%);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(203, 56, 55, 0.3);
}

.sync-btn:disabled {
  background: linear-gradient(135deg, #e67372 0%, #d15a59 100%);
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.sync-btn:not(:disabled):hover {
  background: linear-gradient(135deg, #a82f2e 0%, #8b2423 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(203, 56, 55, 0.4);
}

.loading-icon {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* 内容区域样式 */
.npm-content {
  border-radius: 16px;
  background-color: #ffffff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.3s ease;
}

.npm-content:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}

/* 加载状态样式 */
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
  border-top: 3px solid #cb3837; /* NPM 主题红 */
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  font-size: 16px;
  font-weight: 500;
  color: #495057;
}

/* 空状态样式 */
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
  color: #cb3837; /* NPM 主题红 */
  border: 1px solid #ffd5d5;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.empty-reload-btn:hover {
  background: linear-gradient(135deg, #fdf2f2 0%, #ffd5d5 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(203, 56, 55, 0.2);
}

/* 列表样式 */
.data-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.list-item {
  padding: 20px 24px;
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
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 4px;
  background: linear-gradient(135deg, #cb3837 0%, #a82f2e 100%);
  transform: scaleY(0);
  transition: transform 0.3s ease;
}

.list-item:hover::before {
  transform: scaleY(1);
}

.item-name {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

/* NPM 专属标签 */
.npm-tag {
  font-size: 12px;
  padding: 4px 10px;
  background: linear-gradient(135deg, #cb3837 0%, #a82f2e 100%);
  color: white;
  border-radius: 20px;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(203, 56, 55, 0.15);
}

.item-header {
  margin-bottom: 12px;
}

.item-name {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.package-link {
  color: #cb3837;
  text-decoration: none;
  transition: color 0.3s ease;
}

.package-link:hover {
  color: #a82f2e;
  text-decoration: underline;
}

.version-tag {
  padding: 2px 8px;
  background-color: #f8f9fa;
  color: #666;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.item-desc {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  max-width: 100%;
  word-wrap: break-word;
  background-color: #f8f9fa;
  padding: 12px 16px;
  border-radius: 8px;
  border-left: 3px solid #ffd5d5;
  margin-top: 8px;
  margin-bottom: 16px;
}

/* 统计信息样式 */
.item-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #666;
  padding: 6px 12px;
  background-color: #f8f9fa;
  border-radius: 16px;
  transition: all 0.3s ease;
}

.stat-item:hover {
  background-color: #fdf2f2;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(203, 56, 55, 0.2);
}

.stat-icon {
  font-size: 14px;
}

.stat-text {
  font-weight: 500;
}

/* 详情信息样式 */
.item-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 16px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-label {
  font-size: 12px;
  color: #999;
  font-weight: 500;
}

.detail-value {
  font-size: 13px;
  color: #495057;
  font-weight: 500;
}

/* 链接样式 */
.item-links {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.link-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background-color: #f8f9fa;
  color: #cb3837;
  border: 1px solid #ffd5d5;
  border-radius: 10px;
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.link-item:hover {
  background-color: #fdf2f2;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(203, 56, 55, 0.2);
}

.link-icon {
  font-size: 14px;
}

/* 关键词样式 */
.item-keywords {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.keywords-label {
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.keyword-tag {
  padding: 4px 12px;
  background-color: #fdf2f2;
  color: #cb3837;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid #ffd5d5;
  transition: all 0.3s ease;
}

.keyword-tag:hover {
  background-color: #cb3837;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(203, 56, 55, 0.3);
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
  .npm-view {
    padding: 16px;
  }

  .npm-header {
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
    padding: 16px 20px;
  }

  .list-item:hover {
    transform: translateX(4px);
  }

  .item-name {
    font-size: 16px;
  }

  .version-tag {
    font-size: 11px;
    padding: 2px 6px;
  }

  .item-desc {
    font-size: 13px;
    padding: 10px 14px;
    margin-bottom: 12px;
  }

  .item-stats {
    gap: 10px;
  }

  .stat-item {
    font-size: 12px;
    padding: 4px 8px;
  }

  .item-details {
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 10px 14px;
  }

  .detail-item {
    font-size: 12px;
  }

  .item-links {
    gap: 8px;
  }

  .link-item {
    font-size: 12px;
    padding: 6px 12px;
  }

  .item-keywords {
    gap: 6px;
  }

  .keyword-tag {
    font-size: 11px;
    padding: 3px 8px;
  }
}

@media (max-width: 480px) {
  .npm-header {
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
    padding: 12px 16px;
  }

  .item-name {
    font-size: 14px;
    gap: 8px;
  }

  .version-tag {
    font-size: 10px;
    padding: 2px 4px;
  }

  .item-desc {
    font-size: 12px;
    padding: 8px 12px;
  }

  .item-stats {
    gap: 8px;
  }

  .stat-item {
    font-size: 11px;
    padding: 3px 6px;
  }

  .stat-icon {
    font-size: 12px;
  }

  .item-details {
    padding: 8px 12px;
  }

  .detail-item {
    font-size: 11px;
  }

  .link-item {
    font-size: 11px;
    padding: 4px 10px;
  }

  .link-icon {
    font-size: 12px;
  }

  .keyword-tag {
    font-size: 10px;
    padding: 2px 6px;
  }
}
</style>