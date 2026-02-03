<template>
  <div class="settings-page">
    <div class="settings-container">
      <div class="settings-header">
        <h2>系统配置</h2>
        <p class="header-desc">配置各类 API 令牌和账户信息，配置立即生效</p>
      </div>

      <form class="settings-form" @submit.prevent="handleSave">
        <!-- Render API Token -->
        <div class="form-group">
          <label class="form-label" for="renderApiToken">
            Render API Token
            <span class="required-mark">*</span>
          </label>
          <input
            id="renderApiToken"
            v-model="form.renderApiToken"
            type="text"
            class="form-input"
            placeholder="请输入 Render API Token"
          />
          <p class="form-hint">可在 Render 账户设置的 API 部分获取</p>
        </div>

        <!-- GitHub 用户名 -->
        <div class="form-group">
          <label class="form-label" for="githubUsername">
            GitHub 用户名
            <span class="required-mark">*</span>
          </label>
          <input
            id="githubUsername"
            v-model="form.githubUsername"
            type="text"
            class="form-input"
            placeholder="请输入 GitHub 用户名（小写）"
          />
          <p class="form-hint">你的 GitHub 账号名称，用于关联仓库和 API 调用</p>
        </div>

        <!-- GitHub Token -->
        <div class="form-group">
          <label class="form-label" for="githubToken">
            GitHub Token
            <span class="required-mark">*</span>
          </label>
          <input
            id="githubToken"
            v-model="form.githubToken"
            type="password"
            class="form-input"
            placeholder="请输入 GitHub Personal Access Token"
          />
          <p class="form-hint">
            需要 repo 权限的 Personal Access Token，可在 GitHub Settings >
            Developer settings 中创建
          </p>
        </div>

        <!-- NPM 用户名 -->
        <div class="form-group">
          <label class="form-label" for="npmUsername">
            NPM 用户名
            <span class="required-mark">*</span>
          </label>
          <input
            id="npmUsername"
            v-model="form.npmUsername"
            type="text"
            class="form-input"
            placeholder="请输入 NPM 用户名"
          />
          <p class="form-hint">你的 NPM 账号名称，用于包发布和管理</p>
        </div>

        <!-- 操作按钮 -->
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="handleReset">
            重置
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="saving || !isFormValid"
          >
            <span v-if="saving" class="loading-spinner"></span>
            {{ saving ? "保存中..." : "保存配置" }}
          </button>
        </div>
      </form>

      <!-- 保存结果提示 -->
      <div
        class="notification"
        :class="['notification-' + notification.type]"
        v-if="notification.show"
      >
        <span class="notification-icon">
          {{ notification.type === "success" ? "✓" : "✕" }}
        </span>
        <span class="notification-message">{{ notification.message }}</span>
        <button class="notification-close" @click="hideNotification">×</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { usePiniaHelper } from "@/utils/piniaHelper";

const configHelper = usePiniaHelper("config");

// ========== 适配 utools 环境的核心配置 ==========
// utools 插件存储键名
const STORAGE_KEY = "app_settings_tokens";

// 表单数据
const form = ref({
  renderApiToken: "",
  githubUsername: "",
  githubToken: "",
  npmUsername: "",
});

// 状态管理
const saving = ref(false);
const notification = ref({
  show: false,
  type: "success", // success / error
  message: "",
});

// 验证表单是否有效
const isFormValid = computed(() => {
  return (
    form.value.renderApiToken.trim() !== "" &&
    form.value.githubUsername.trim() !== "" &&
    form.value.githubToken.trim() !== "" &&
    form.value.npmUsername.trim() !== ""
  );
});

// ========== utools 存储操作 ==========
// 从 utools 存储读取配置（初始化表单）
const loadSettings = () => {
  try {
    let savedData = {};

    // 优先使用 utools 专属存储 API
    if (window.utools && window.utools.db) {
      const result = window.utools.db.get(STORAGE_KEY);
      savedData = result?.data || {};
    } else {
      // 降级方案：使用 localStorage
      const jsonStr = localStorage.getItem(STORAGE_KEY);
      savedData = jsonStr ? JSON.parse(jsonStr) : {};
    }

    // 填充表单数据（映射 VITE_XXX 到表单字段）
    form.value = {
      renderApiToken: savedData.VITE_RENDER_API_TOKEN || "",
      githubUsername: savedData.VITE_GITHUB_USERNAME || "",
      githubToken: savedData.VITE_GITHUB_TOKEN || "",
      npmUsername: savedData.VITE_NPM_USERNAME || "",
    };

    // 同步到 pinia（结构统一为 VITE_XXX）
    configHelper.set("updateConfigInfo", savedData);
    // 同步到全局配置
    window.appConfig = savedData;
  } catch (error) {
    console.error("读取配置失败:", error);
    showNotification("error", "读取现有配置失败：" + error.message);
  }
};

// 保存配置到 utools 存储
const handleSave = async () => {
  if (!isFormValid.value) {
    showNotification("error", "请填写所有必填字段");
    return;
  }

  saving.value = true;

  try {
    // 整理要保存的数据（保持和环境变量一致的键名）
    const saveData = {
      VITE_RENDER_API_TOKEN: form.value.renderApiToken.trim(),
      VITE_GITHUB_USERNAME: form.value.githubUsername.trim(),
      VITE_GITHUB_TOKEN: form.value.githubToken.trim(),
      VITE_NPM_USERNAME: form.value.npmUsername.trim(),
    };

    // 保存到 utools 存储（处理异步，确保保存成功）
    if (window.utools && window.utools.db) {
      // utools.db.put 是异步操作，需要等待（utools 4.x+ 支持 await）
      await window.utools.db.put({
        _id: STORAGE_KEY,
        data: saveData,
      });
    } else {
      // 降级方案：localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
    }

    // ========== 重要：将配置挂载到 window 全局，方便其他组件使用 ==========
    window.appConfig = { ...saveData }; // 深拷贝避免引用问题
    // 同步到 pinia
    configHelper.set("updateConfigInfo", saveData);

    showNotification("success", "配置保存成功！立即生效");
  } catch (error) {
    console.error("保存配置失败:", error);
    showNotification("error", "保存配置失败：" + error.message);
  } finally {
    saving.value = false;
  }
};

// ========== 辅助方法 ==========
// 重置表单
const handleReset = async () => {
  // 清空表单
  form.value = {
    renderApiToken: "",
    githubUsername: "",
    githubToken: "",
    npmUsername: "",
  };

  // 清空全局配置
  const emptyData = {};
  window.appConfig = emptyData;
  // 同步到 pinia
  configHelper.set("updateConfigInfo", emptyData);

  try {
    // 重置 utools 存储（和 localStorage 行为一致：删除文档）
    if (window.utools && window.utools.db) {
      // 先判断文档是否存在，存在则删除（避免删除不存在的文档报错）
      const exists = window.utools.db.get(STORAGE_KEY);
      if (exists) {
        await window.utools.db.remove(STORAGE_KEY);
      }
    }
    // 重置 localStorage（删除）
    localStorage.removeItem(STORAGE_KEY);

    showNotification("success", "配置已重置！");
  } catch (error) {
    console.error("重置配置失败:", error);
    showNotification("error", "重置配置失败：" + error.message);
  }
};

// 显示通知
const showNotification = (type, message) => {
  notification.value = {
    show: true,
    type,
    message,
  };

  // 5秒后自动关闭
  setTimeout(() => {
    hideNotification();
  }, 5000);
};

// 隐藏通知
const hideNotification = () => {
  notification.value.show = false;
};

// ========== 初始化 ==========
onMounted(() => {
  // 页面加载时先读取配置，再初始化全局
  loadSettings();
});
</script>

<style scoped>
/* 优化后的样式 */
.settings-page {
  min-height: 100%;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%);
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.settings-container {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  padding: 40px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.settings-container:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
}

.settings-header {
  margin-bottom: 40px;
  padding-bottom: 24px;
  border-bottom: 1px solid #f0f2f5;
  text-align: center;
}

.settings-header h2 {
  margin: 0 0 12px 0;
  font-size: 28px;
  color: #1d2129;
  font-weight: 700;
  background: linear-gradient(135deg, #4096ff 0%, #0e76e8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-desc {
  margin: 0;
  color: #86909c;
  font-size: 16px;
  line-height: 1.6;
  max-width: 600px;
  margin: 0 auto;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all 0.3s ease;
}

.form-group:hover {
  transform: translateX(4px);
}

.form-label {
  font-size: 15px;
  font-weight: 600;
  color: #1d2129;
  display: flex;
  align-items: center;
  gap: 6px;
}

.required-mark {
  color: #f53f3f;
  font-size: 14px;
  font-weight: 700;
}

.form-input {
  padding: 14px 18px;
  border: 1px solid #d9d9d9;
  border-radius: 10px;
  font-size: 15px;
  color: #1d2129;
  transition: all 0.3s ease;
  background-color: #fafbfc;
}

.form-input:focus {
  outline: none;
  border-color: #4096ff;
  box-shadow: 0 0 0 3px rgba(64, 150, 255, 0.15);
  background-color: white;
  transform: translateY(-1px);
}

.form-input::placeholder {
  color: #86909c;
  font-size: 14px;
}

.form-hint {
  margin: 0;
  font-size: 13px;
  color: #86909c;
  line-height: 1.5;
  background-color: #f8f9fa;
  padding: 8px 12px;
  border-radius: 6px;
  border-left: 3px solid #e6f7ff;
}

.form-actions {
  display: flex;
  gap: 16px;
  margin-top: 24px;
  justify-content: flex-end;
  padding-top: 24px;
  border-top: 1px solid #f0f2f5;
}

.btn {
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-width: 120px;
}

.btn-secondary {
  background-color: #f5f7fa;
  color: #4e5969;
  border: 1px solid #e5e6eb;
}

.btn-secondary:hover {
  background-color: #e5e6eb;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.btn-primary {
  background: linear-gradient(135deg, #4096ff 0%, #0e76e8 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(64, 150, 255, 0.3);
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #3385ff 0%, #0a66d9 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(64, 150, 255, 0.4);
}

.btn-primary:disabled {
  background: linear-gradient(135deg, #8cc1ff 0%, #6cb2ff 100%);
  cursor: not-allowed;
  opacity: 0.8;
  transform: none;
  box-shadow: none;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.notification {
  margin-top: 24px;
  padding: 16px 20px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 12px;
  animation: fadeIn 0.4s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.notification-success {
  background: linear-gradient(135deg, #f0f9ff 0%, #e6f7ff 100%);
  color: #00b42a;
  border: 1px solid #b7eb8f;
}

.notification-error {
  background: linear-gradient(135deg, #fff2f0 0%, #ffefe8 100%);
  color: #f53f3f;
  border: 1px solid #ffccc7;
}

.notification-icon {
  font-weight: bold;
  font-size: 18px;
  background-color: currentColor;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notification-message {
  flex: 1;
  font-size: 15px;
  line-height: 1.5;
}

.notification-close {
  background: none;
  border: none;
  color: inherit;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.notification-close:hover {
  background-color: rgba(0, 0, 0, 0.1);
  transform: rotate(90deg);
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-15px);
    box-shadow: 0 0 0 rgba(0, 0, 0, 0.08);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
}

@media (max-width: 768px) {
  .settings-page {
    padding: 16px;
  }
  
  .settings-container {
    padding: 28px;
    border-radius: 12px;
  }
  
  .settings-header h2 {
    font-size: 24px;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
    padding: 14px 20px;
  }
  
  .form-group:hover {
    transform: none;
  }
}

@media (max-width: 480px) {
  .settings-container {
    padding: 20px;
  }
  
  .settings-header h2 {
    font-size: 22px;
  }
  
  .form-input {
    padding: 10px 14px;
  }
}
</style>