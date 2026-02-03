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
/* 优化后的样式 */
.local-view {
  min-height: 100%;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%);
}

/* 顶部栏样式 */
.local-header {
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

.local-header:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}

.header-title {
  margin: 0;
  font-size: 24px;
  color: #2c3e50;
  font-weight: 700;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.btn-group {
  display: flex;
  gap: 12px;
}

.select-dir-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.modern-btn {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
}

.modern-btn:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
}

.fallback-btn {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.fallback-btn:hover {
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(245, 158, 11, 0.4);
}

/* 数据展示区域 */
.data-area {
  border-radius: 16px;
  background-color: #ffffff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  min-height: 600px;
  transition: all 0.3s ease;
}

.data-area:hover {
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
  border-top: 3px solid #3b82f6;
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
  height: 100%;
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

.empty-btn-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.empty-reload-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.empty-reload-btn.modern-btn {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
}

.empty-reload-btn.modern-btn:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
}

.empty-reload-btn.fallback-btn {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.empty-reload-btn.fallback-btn:hover {
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(245, 158, 11, 0.4);
}

/* 文件树容器样式 */
.file-tree-container {
  padding: 20px;
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
  animation: fadeIn 0.3s ease;
}

.preview-modal {
  width: 90%;
  max-width: 1200px;
  max-height: 90vh;
  background-color: white;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.4s ease;
}

.preview-header {
  padding: 16px 24px;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #334155;
}

.preview-title {
  font-size: 18px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80%;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.close-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
  transform: rotate(90deg);
}

.preview-content {
  flex: 1;
  padding: 20px;
  overflow: auto;
  background-color: #f8fafc;
}

.preview-loading {
  text-align: center;
  padding: 60px;
  color: #666;
  font-size: 16px;
  font-weight: 500;
}

.code-pre {
  margin: 0;
  padding: 24px;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border-radius: 10px;
  overflow-x: auto;
  color: #e2e8f0;
  font-size: 14px;
  line-height: 1.6;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.error-msg {
  color: #ef4444;
  padding: 40px;
  text-align: center;
  font-size: 16px;
  font-weight: 500;
  background-color: #fef2f2;
  border: 1px solid #fee2e2;
  border-radius: 10px;
  margin: 20px;
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

/* 淡入动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 上滑动画 */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 响应式适配 */
@media (max-width: 768px) {
  .local-view {
    padding: 16px;
  }
  
  .local-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 16px;
  }
  
  .header-title {
    font-size: 20px;
  }
  
  .btn-group {
    width: 100%;
    flex-direction: column;
    gap: 10px;
  }
  
  .select-dir-btn {
    width: 100%;
    padding: 12px 20px;
  }
  
  .empty-btn-group {
    flex-direction: column;
    width: 100%;
    max-width: 300px;
  }
  
  .empty-reload-btn {
    width: 100%;
  }
  
  .file-tree-container {
    padding: 16px;
  }
  
  .preview-modal {
    width: 95%;
    max-height: 85vh;
  }
  
  .preview-header {
    padding: 12px 20px;
  }
  
  .preview-title {
    font-size: 16px;
  }
  
  .preview-content {
    padding: 16px;
  }
  
  .code-pre {
    font-size: 13px;
    padding: 16px;
  }
}

@media (max-width: 480px) {
  .local-header {
    padding: 12px;
  }
  
  .header-title {
    font-size: 18px;
  }
  
  .select-dir-btn {
    padding: 10px 16px;
    font-size: 13px;
  }
  
  .file-tree-container {
    padding: 12px;
  }
  
  .preview-modal {
    width: 98%;
  }
  
  .preview-content {
    padding: 12px;
  }
  
  .code-pre {
    font-size: 12px;
    padding: 12px;
  }
}
</style>