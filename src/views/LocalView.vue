<template>
  <div class="local-view">
    <!-- 顶部栏 -->
    <div class="local-header">
      <h2 class="header-title">本地文件浏览器</h2>
      <div class="btn-group">
        <!-- 现代浏览器方案 -->
        <button
          class="select-dir-btn modern-btn"
          @click="selectDirectoryModern"
          v-if="supportsFileSystemAccess"
        >
          选择本地文件夹（推荐）
        </button>
        <!-- 兼容方案 -->
        <button
          class="select-dir-btn fallback-btn"
          @click="selectDirectoryFallback"
        >
          选择本地文件夹（兼容模式）
        </button>
      </div>
    </div>

    <!-- 数据展示区域 -->
    <div class="data-area">
      <div v-if="loading" class="loading">
        <span class="loading-spinner"></span>
        <span class="loading-text">加载中...</span>
      </div>
      <div v-else-if="!fileTree.length" class="empty">
        <span class="empty-icon">📂</span>
        <p>未选择文件夹或文件夹为空</p>
        <div class="empty-btn-group">
          <button
            class="empty-reload-btn modern-btn"
            @click="selectDirectoryModern"
            v-if="supportsFileSystemAccess"
          >
            重新选择（推荐）
          </button>
          <button
            class="empty-reload-btn fallback-btn"
            @click="selectDirectoryFallback"
          >
            重新选择（兼容）
          </button>
        </div>
      </div>
      <div v-else class="file-tree-container">
        <!-- 引入独立的递归组件 -->
        <tree-node
          v-for="node in fileTree"
          :key="node.path || node.webkitRelativePath"
          :node="node"
          @open-file="openFilePreview"
        />
      </div>
    </div>

    <!-- 隐藏的文件选择输入框（兼容方案） -->
    <input
      ref="fileInput"
      type="file"
      webkitdirectory
      directory
      style="display: none"
      @change="handleFileInputChange"
    />

    <!-- 文件预览弹窗 -->
    <teleport to="body">
      <div
        v-if="previewVisible"
        class="preview-modal-mask"
        @click="closePreview"
      >
        <div class="preview-modal" @click.stop>
          <div class="preview-header">
            <span class="preview-title">{{ previewFile?.name }}</span>
            <button class="close-btn" @click="closePreview">×</button>
          </div>
          <div class="preview-content">
            <div v-if="previewLoading" class="preview-loading">加载中...</div>
            <pre v-else class="code-pre" ref="codePreview">
              <code :class="`language-${getFileExtension(previewFile?.name)}`" v-html="previewContent"></code>
            </pre>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from "vue";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css"; // 引入高亮样式
// 导入独立的树形节点组件
import TreeNode from "@/components/TreeNode.vue";

// 检测浏览器是否支持 File System Access API
const supportsFileSystemAccess = computed(() => {
  return "showDirectoryPicker" in window;
});

// 状态管理
const loading = ref(false);
const fileTree = ref([]);
const previewVisible = ref(false);
const previewLoading = ref(false);
const previewFile = ref(null);
const previewContent = ref("");
const codePreview = ref(null);
const fileInput = ref(null);
// 存储兼容模式下的文件数据
const fallbackFileData = ref({});

// ========== 现代浏览器方案 (File System Access API) ==========
const selectDirectoryModern = async () => {
  try {
    loading.value = true;
    fileTree.value = [];

    // 修复：正确处理 showDirectoryPicker 返回值（不使用解构赋值）
    const dirHandle = await window.showDirectoryPicker();
    if (!dirHandle) return;

    // 递归读取文件夹内容
    const fileTreeData = await readDirectoryModern(dirHandle, dirHandle.name);
    fileTree.value = [fileTreeData];
  } catch (error) {
    if (error.name !== "AbortError") {
      // 忽略用户取消选择的情况
      console.error("选择文件夹失败 (现代模式):", error);
      alert(`选择文件夹失败：${error.message}\n建议尝试兼容模式`);
    }
  } finally {
    loading.value = false;
  }
};

// 递归读取文件夹内容（现代模式）
const readDirectoryModern = async (dirHandle, name, path = "") => {
  const currentPath = path ? `${path}/${name}` : name;
  const node = {
    name,
    path: currentPath,
    type: "dir",
    handle: dirHandle,
    children: [],
  };

  // 遍历文件夹中的所有条目
  for await (const [key, handle] of dirHandle.entries()) {
    if (handle.kind === "directory") {
      // 递归读取子文件夹
      const childNode = await readDirectoryModern(handle, key, currentPath);
      node.children.push(childNode);
    } else if (handle.kind === "file") {
      // 添加文件节点
      node.children.push({
        name: key,
        path: `${currentPath}/${key}`,
        type: "file",
        handle,
      });
    }
  }

  return node;
};

// ========== 兼容方案 (传统文件输入框) ==========
const selectDirectoryFallback = () => {
  if (fileInput.value) {
    // 清空之前的选择
    fileInput.value.value = "";
    // 触发文件选择对话框
    fileInput.value.click();
  }
};

// 处理兼容模式下的文件选择
const handleFileInputChange = (e) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  loading.value = true;

  try {
    // 清空之前的数据
    fallbackFileData.value = {};
    fileTree.value = [];

    // 处理选中的文件，构建文件树
    const fileList = Array.from(files);

    // 存储所有文件路径，用于构建目录结构
    fileList.forEach((file) => {
      fallbackFileData.value[file.webkitRelativePath] = file;
    });

    // 构建文件树
    const root = {
      name: "选中的文件夹",
      type: "dir",
      children: [],
    };

    fileList.forEach((file) => {
      const pathParts = file.webkitRelativePath.split("/");
      buildTree(root, pathParts, file);
    });

    fileTree.value = [root];
  } catch (error) {
    console.error("处理文件夹失败 (兼容模式):", error);
    alert(`处理文件夹失败：${error.message}`);
  } finally {
    loading.value = false;
  }
};

// 构建文件树结构（兼容模式）
const buildTree = (node, pathParts, file) => {
  if (pathParts.length === 0) return;

  const currentPart = pathParts.shift();

  // 检查当前节点是否已存在
  let childNode = node.children.find((child) => child.name === currentPart);

  if (!childNode) {
    // 判断是文件还是文件夹
    const isFile = pathParts.length === 0;

    childNode = {
      name: currentPart,
      type: isFile ? "file" : "dir",
      children: [],
      // 存储文件对象（仅文件节点）
      ...(isFile ? { file, webkitRelativePath: file.webkitRelativePath } : {}),
    };

    node.children.push(childNode);
  }

  // 递归构建子节点
  buildTree(childNode, pathParts, file);
};

// ========== 文件预览功能 ==========
// 打开文件预览
const openFilePreview = async (fileNode) => {
  if (fileNode.type !== "file") return;

  previewFile.value = fileNode;
  previewVisible.value = true;
  previewLoading.value = true;

  try {
    let content = "";

    // 区分现代模式和兼容模式
    if (fileNode.handle) {
      // 现代模式：使用 File System Access API
      const file = await fileNode.handle.getFile();
      content = await file.text();
    } else if (fileNode.file) {
      // 兼容模式：使用 FileReader
      content = await readFileContent(fileNode.file);
    }

    // 使用 highlight.js 高亮代码
    previewContent.value = hljs.highlightAuto(content).value;
  } catch (error) {
    console.error("读取文件失败:", error);
    previewContent.value = `<div class="error-msg">读取文件失败：${error.message}</div>`;
  } finally {
    previewLoading.value = false;
  }
};

// 读取文件内容（兼容模式）
const readFileContent = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

// 关闭预览弹窗
const closePreview = () => {
  previewVisible.value = false;
  previewFile.value = null;
  previewContent.value = "";
};

// 获取文件扩展名
const getFileExtension = (fileName) => {
  if (!fileName) return "";
  const ext = fileName.split(".").pop().toLowerCase();
  // 映射常见扩展名到highlight.js支持的语言
  const extMap = {
    js: "javascript",
    vue: "html",
    ts: "typescript",
    json: "json",
    md: "markdown",
    html: "html",
    css: "css",
    scss: "scss",
    java: "java",
    py: "python",
    php: "php",
  };
  return extMap[ext] || ext || "plaintext";
};

// ========== 初始化 ==========
// 初始化highlight.js
onMounted(() => {
  if (codePreview.value) {
    hljs.highlightElement(codePreview.value);
  }
});

// 监听预览内容变化，重新高亮
watch(previewContent, () => {
  if (codePreview.value) {
    hljs.highlightElement(codePreview.value.querySelector("code"));
  }
});
</script>

<style scoped>
/* 全局容器样式 */
.local-view {
  max-width: 1200px;
  margin: 20px auto;
  padding: 0 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* 顶部栏样式 */
.local-header {
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

.btn-group {
  display: flex;
  gap: 8px;
}

.select-dir-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.modern-btn {
  background-color: #3b82f6;
  color: white;
}

.modern-btn:hover {
  background-color: #2563eb;
}

.fallback-btn {
  background-color: #f59e0b;
  color: white;
}

.fallback-btn:hover {
  background-color: #d97706;
}

/* 数据展示区域 */
.data-area {
  border-radius: 8px;
  background-color: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  min-height: 600px;
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
  border-top: 2px solid #3b82f6;
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

.empty-btn-group {
  display: flex;
  gap: 8px;
}

.empty-reload-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s ease;
  color: white;
}

/* 文件树容器样式 */
.file-tree-container {
  padding: 16px;
}

/* 预览弹窗样式 */
.preview-modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.preview-modal {
  width: 90%;
  max-width: 1200px;
  max-height: 90vh;
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.preview-header {
  padding: 12px 20px;
  background-color: #1e293b;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-title {
  font-size: 16px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80%;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-content {
  flex: 1;
  padding: 16px;
  overflow: auto;
}

.preview-loading {
  text-align: center;
  padding: 40px;
  color: #666;
  font-size: 14px;
}

.code-pre {
  margin: 0;
  padding: 16px;
  background-color: #1e293b;
  border-radius: 4px;
  overflow-x: auto;
  color: #e2e8f0;
  font-size: 14px;
  line-height: 1.5;
}

.error-msg {
  color: #ef4444;
  padding: 20px;
  text-align: center;
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
  .local-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .btn-group {
    width: 100%;
    flex-direction: column;
  }

  .select-dir-btn {
    width: 100%;
  }

  .preview-modal {
    width: 95%;
    max-height: 85vh;
  }

  .code-pre {
    font-size: 13px;
  }
}
</style>