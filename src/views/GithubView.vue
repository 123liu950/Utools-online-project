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
          <!-- 仓库标题和基本信息 -->
          <div class="item-header">
            <div class="item-name">
              <img v-if="item.owner?.avatar_url" :src="item.owner.avatar_url" alt="Owner Avatar" class="owner-avatar">
              <a :href="item.html_url" target="_blank" rel="noopener noreferrer" class="repo-link">{{ item.name }}</a>
              <span v-if="item.private" class="repo-badge private-badge">私有</span>
              <span v-if="item.fork" class="repo-badge fork-badge">Fork</span>
            </div>
            <div class="item-full-name">{{ item.full_name }}</div>
          </div>
          
          <!-- 仓库描述 -->
          <div v-if="item.description" class="item-desc">
            {{ item.description }}
          </div>
          
          <!-- 仓库统计信息 -->
          <div class="item-stats">
            <div class="stat-item">
              <span class="stat-icon">⭐</span>
              <span class="stat-text">{{ item.stargazers_count }} 星</span>
            </div>
            <div class="stat-item">
              <span class="stat-icon">🔄</span>
              <span class="stat-text">{{ item.forks_count }} Fork</span>
            </div>
            <div class="stat-item">
              <span class="stat-icon">👁️</span>
              <span class="stat-text">{{ item.watchers_count }} 监视</span>
            </div>
            <div class="stat-item">
              <span class="stat-icon">📋</span>
              <span class="stat-text">{{ item.open_issues_count }} 问题</span>
            </div>
            <div class="stat-item">
              <span class="stat-icon">📦</span>
              <span class="stat-text">{{ item.size }} KB</span>
            </div>
          </div>
          
          <!-- 仓库详情信息 -->
          <div class="item-details">
            <div class="detail-item">
              <span class="detail-label">创建时间：</span>
              <span class="detail-value">{{ formatDate(item.created_at) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">更新时间：</span>
              <span class="detail-value">{{ formatDate(item.updated_at) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">默认分支：</span>
              <span class="detail-value">{{ item.default_branch }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">可见性：</span>
              <span class="detail-value">{{ item.visibility === 'public' ? '公开' : '私有' }}</span>
            </div>
          </div>
          
          <!-- 仓库标签 -->
          <div v-if="item.topics && item.topics.length" class="item-topics">
            <span class="topics-label">标签：</span>
            <span v-for="(topic, idx) in item.topics" :key="idx" class="topic-tag">{{ topic }}</span>
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
      full_name: item.full_name,
      description: item.description,
      private: item.private,
      fork: item.fork,
      created_at: item.created_at,
      updated_at: item.updated_at,
      size: item.size,
      stargazers_count: item.stargazers_count,
      watchers_count: item.watchers_count,
      forks_count: item.forks_count,
      open_issues_count: item.open_issues_count,
      default_branch: item.default_branch,
      visibility: item.visibility,
      topics: item.topics,
      owner: {
        login: item.owner.login,
        avatar_url: item.owner.avatar_url
      },
      html_url: item.html_url
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

// 格式化日期函数
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.github-view {
  min-height: 100%;
  margin: 0px auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%);
}

/* 顶部栏样式 */
.github-header {
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

.github-header:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}

.header-title {
  margin: 0;
  font-size: 24px;
  color: #2c3e50;
  font-weight: 700;
  background: linear-gradient(135deg, #409eff 0%, #0e76e8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.sync-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #409eff 0%, #0e76e8 100%);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(64, 150, 255, 0.3);
}

.sync-btn:disabled {
  background: linear-gradient(135deg, #a0cfff 0%, #6cb2ff 100%);
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

.sync-btn:not(:disabled):hover {
  background: linear-gradient(135deg, #337ecc 0%, #0a66d9 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(64, 150, 255, 0.4);
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
.github-content {
  border-radius: 16px;
  background-color: #ffffff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.3s ease;
}

.github-content:hover {
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
  border-top: 3px solid #409eff;
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
  color: #409eff;
  border: 1px solid #d9ecff;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.empty-reload-btn:hover {
  background: linear-gradient(135deg, #eef2f7 0%, #d9ecff 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 150, 255, 0.2);
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
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 4px;
  background: linear-gradient(135deg, #409eff 0%, #0e76e8 100%);
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
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.item-name::before {
  content: '📁';
  font-size: 16px;
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

.owner-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #e6f7ff;
}

.repo-link {
  color: #409eff;
  text-decoration: none;
  transition: color 0.3s ease;
}

.repo-link:hover {
  color: #0e76e8;
  text-decoration: underline;
}

.repo-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  margin-left: 6px;
}

.private-badge {
  background-color: #ffe7cc;
  color: #fa8c16;
  border: 1px solid #ffd591;
}

.fork-badge {
  background-color: #e6f7ff;
  color: #1890ff;
  border: 1px solid #91d5ff;
}

.item-full-name {
  font-size: 13px;
  color: #999;
  margin-left: 34px;
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
  border-left: 3px solid #e6f7ff;
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
  background-color: #e6f7ff;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(64, 150, 255, 0.2);
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

/* 标签样式 */
.item-topics {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.topics-label {
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.topic-tag {
  padding: 4px 12px;
  background-color: #e6f7ff;
  color: #1890ff;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid #91d5ff;
  transition: all 0.3s ease;
}

.topic-tag:hover {
  background-color: #1890ff;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
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
  .github-view {
    padding: 16px;
  }
  
  .github-header {
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
  
  .item-full-name {
    font-size: 12px;
    margin-left: 28px;
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
  
  .item-topics {
    gap: 6px;
  }
  
  .topic-tag {
    font-size: 11px;
    padding: 3px 8px;
  }
}

@media (max-width: 480px) {
  .github-header {
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
  
  .owner-avatar {
    width: 20px;
    height: 20px;
  }
  
  .item-full-name {
    font-size: 11px;
    margin-left: 24px;
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
  
  .topic-tag {
    font-size: 10px;
    padding: 2px 6px;
  }
}
</style>