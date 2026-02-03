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
            <div class="preview-header-actions">
              <a
                v-if="previewUrl"
                :href="previewUrl"
                :download="previewFile?.name"
                class="download-btn"
              >
                下载
              </a>
              <button class="close-btn" @click="closePreview">×</button>
            </div>
          </div>
          <div class="preview-content">
            <div v-if="previewLoading" class="preview-loading">加载中...</div>
            <div v-else class="preview-body">
              <!-- 文本/代码 -->
              <pre v-if="previewType === 'text'" class="code-pre">
                <code v-html="previewContent"></code>
              </pre>

              <!-- 图片 -->
              <div v-else-if="previewType === 'image'" class="media-container">
                <img :src="previewUrl" alt="预览图片" />
              </div>

              <!-- PDF -->
              <iframe
                v-else-if="previewType === 'pdf'"
                :src="previewUrl"
                class="pdf-viewer"
              ></iframe>

              <!-- 视频 -->
              <div v-else-if="previewType === 'video'" class="media-container">
                <video :src="previewUrl" controls autoplay></video>
              </div>

              <!-- 音频 -->
              <div v-else-if="previewType === 'audio'" class="media-container">
                <audio :src="previewUrl" controls></audio>
              </div>

              <!-- Word (使用 mammoth 转 HTML) -->
              <div
                v-else-if="previewType === 'word'"
                class="office-preview"
                v-html="previewContent"
              ></div>

              <!-- Excel (使用 xlsx 转 HTML 表格) -->
              <div
                v-else-if="previewType === 'excel'"
                class="office-preview"
                v-html="previewContent"
              ></div>

              <!-- 不支持 -->
              <div v-else class="unsupported">
                <p>浏览器无法直接预览此文件类型</p>
                <p>已为您生成下载链接，可下载后用相应软件打开</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";

// 新增：Word 和 Excel 预览所需库（请提前 npm install mammoth xlsx）
import mammoth from "mammoth";
import * as XLSX from "xlsx";

// 导入树形节点组件
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
const previewContent = ref(""); // 用于文本、Word、Excel 的 HTML 内容
const previewUrl = ref(""); // 用于图片、PDF、音视频、不支持类型的 object URL
const previewType = ref(""); // text | image | pdf | video | audio | word | excel | unsupported
const fileInput = ref(null);
const fallbackFileData = ref({});

// ========== 现代浏览器方案 ==========
const selectDirectoryModern = async () => {
  try {
    loading.value = true;
    fileTree.value = [];

    const dirHandle = await window.showDirectoryPicker();
    if (!dirHandle) return;

    const fileTreeData = await readDirectoryModern(dirHandle, dirHandle.name);
    fileTree.value = [fileTreeData];
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error("选择文件夹失败 (现代模式):", error);
      alert(`选择文件夹失败：${error.message}\n建议尝试兼容模式`);
    }
  } finally {
    loading.value = false;
  }
};

const readDirectoryModern = async (dirHandle, name, path = "") => {
  const currentPath = path ? `${path}/${name}` : name;
  const node = {
    name,
    path: currentPath,
    type: "dir",
    handle: dirHandle,
    children: [],
  };

  for await (const [key, handle] of dirHandle.entries()) {
    if (handle.kind === "directory") {
      const childNode = await readDirectoryModern(handle, key, currentPath);
      node.children.push(childNode);
    } else if (handle.kind === "file") {
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

// ========== 兼容方案 ==========
const selectDirectoryFallback = () => {
  if (fileInput.value) {
    fileInput.value.value = "";
    fileInput.value.click();
  }
};

const handleFileInputChange = (e) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  loading.value = true;

  try {
    fallbackFileData.value = {};
    fileTree.value = [];

    const fileList = Array.from(files);

    fileList.forEach((file) => {
      fallbackFileData.value[file.webkitRelativePath] = file;
    });

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

const buildTree = (node, pathParts, file) => {
  if (pathParts.length === 0) return;

  const currentPart = pathParts.shift();
  let childNode = node.children.find((child) => child.name === currentPart);

  if (!childNode) {
    const isFile = pathParts.length === 0;
    childNode = {
      name: currentPart,
      type: isFile ? "file" : "dir",
      children: [],
      ...(isFile ? { file, webkitRelativePath: file.webkitRelativePath } : {}),
    };
    node.children.push(childNode);
  }

  buildTree(childNode, pathParts, file);
};

// ========== 文件预览功能 ==========
const openFilePreview = async (fileNode) => {
  if (fileNode.type !== "file") return;

  // 清理上一次的 object URL
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = "";
  }

  previewFile.value = fileNode;
  previewVisible.value = true;
  previewLoading.value = true;
  previewContent.value = "";
  previewType.value = "";

  try {
    // 获取 File 对象（现代/兼容模式统一）
    let fileObj;
    if (fileNode.handle) {
      // 现代模式
      fileObj = await fileNode.handle.getFile();
    } else if (fileNode.file) {
      // 兼容模式
      fileObj = fileNode.file;
    }

    if (!fileObj) return;

    // 始终创建 object URL（用于下载、图片、PDF、音视频、不支持类型）
    previewUrl.value = URL.createObjectURL(fileObj);

    // 判断预览类型
    previewType.value = getPreviewType(fileObj);

    // 需要读取内容的类型
    if (["text", "word", "excel"].includes(previewType.value)) {
      if (previewType.value === "text") {
        const content = await fileObj.text();
        previewContent.value = hljs.highlightAuto(content).value;
      } else if (previewType.value === "word") {
        const arrayBuffer = await fileObj.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        previewContent.value = result.value;
      } else if (previewType.value === "excel") {
        const arrayBuffer = await fileObj.arrayBuffer();
        const wb = XLSX.read(arrayBuffer, { type: "array" });
        let html = "";
        wb.SheetNames.forEach((sheetName) => {
          const sheet = wb.Sheets[sheetName];
          html += `<h3 style="margin-top:24px;color:#3b82f6;">${sheetName}</h3>`;
          html += XLSX.utils.sheet_to_html(sheet);
        });
        previewContent.value = html;
      }
    }
    // 其他类型（image/pdf/video/audio/unsupported）直接使用 previewUrl
  } catch (error) {
    console.error("读取文件失败:", error);
    previewContent.value = `<div class="error-msg">读取文件失败：${error.message}</div>`;
    previewType.value = "unsupported";
  } finally {
    previewLoading.value = false;
  }
};

// 判断文件预览类型
const getPreviewType = (fileObj) => {
  const mime = fileObj.type || "";
  const ext = fileObj.name.split(".").pop()?.toLowerCase() || "";

  // MIME 优先
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("text/")) return "text";

  // 扩展名兜底
  const imageExts = [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "bmp",
    "webp",
    "svg",
    "ico",
    "tiff",
  ];
  const videoExts = ["mp4", "webm", "ogg", "avi", "mov", "mkv"];
  const audioExts = ["mp3", "wav", "ogg", "m4a", "flac"];
  const textExts = [
    "js",
    "ts",
    "vue",
    "html",
    "css",
    "scss",
    "json",
    "md",
    "txt",
    "log",
    "xml",
    "yaml",
    "yml",
    "csv",
  ];

  if (imageExts.includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (videoExts.includes(ext)) return "video";
  if (audioExts.includes(ext)) return "audio";
  if (textExts.includes(ext)) return "text";
  if (["doc", "docx"].includes(ext)) return "word";
  if (["xls", "xlsx", "csv"].includes(ext))
    return ext === "csv" ? "text" : "excel";

  return "unsupported";
};

const closePreview = () => {
  previewVisible.value = false;
  previewFile.value = null;
  previewContent.value = "";
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = "";
  }
};
</script>

<style scoped>
/* 主容器样式 */
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
  padding: 24px;
  margin-bottom: 24px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.local-header::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: linear-gradient(90deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%);
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
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-title::before {
  content: "📁";
  font-size: 20px;
  background: none;
  -webkit-background-clip: unset;
  -webkit-text-fill-color: unset;
}

.btn-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.select-dir-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.select-dir-btn::before {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  transition: left 0.6s ease;
}

.select-dir-btn:hover::before {
  left: 100%;
}

.modern-btn {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
}

.fallback-btn {
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
  color: #3b82f6;
  border: 1px solid #dbeafe;
}

.select-dir-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.3);
}

.select-dir-btn:active {
  transform: translateY(0);
}

/* 数据展示区域 */
.data-area {
  border-radius: 16px;
  background-color: #ffffff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
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
  position: relative;
  overflow: hidden;
}

.loading::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(
    circle at 50% 50%,
    rgba(59, 130, 246, 0.1) 0%,
    transparent 70%
  );
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e0e0e0;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  position: relative;
  z-index: 1;
}

.loading-text {
  font-size: 16px;
  font-weight: 500;
  color: #495057;
  position: relative;
  z-index: 1;
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
  position: relative;
  overflow: hidden;
}

.empty::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(
    circle at 50% 50%,
    rgba(59, 130, 246, 0.08) 0%,
    transparent 70%
  );
}

.empty-icon {
  font-size: 72px;
  margin-bottom: 24px;
  opacity: 0.8;
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
  animation: float 3s ease-in-out infinite;
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
  position: relative;
  z-index: 1;
}

.empty-btn-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
}

.empty-reload-btn {
  padding: 10px 24px;
  border: 1px solid #dbeafe;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  position: relative;
  overflow: hidden;
}

.empty-reload-btn::before {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(59, 130, 246, 0.2),
    transparent
  );
  transition: left 0.6s ease;
}

.empty-reload-btn:hover::before {
  left: 100%;
}

.empty-reload-btn.modern-btn {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  border: none;
}

.empty-reload-btn.fallback-btn {
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
  color: #3b82f6;
}

.empty-reload-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

/* 文件树容器 */
.file-tree-container {
  padding: 24px;
  max-height: 70vh;
  overflow-y: auto;
}

.file-tree-container::-webkit-scrollbar {
  width: 8px;
}

.file-tree-container::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.file-tree-container::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%);
  border-radius: 4px;
  transition: all 0.3s ease;
}

.file-tree-container::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%);
}

/* 预览弹窗 */
.preview-modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(6px);
  animation: fadeIn 0.3s ease;
}

.preview-modal {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 1000px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease;
  position: relative;
  overflow: hidden;
}

.preview-modal::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: linear-gradient(90deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 16px 16px 0 0;
}

.preview-title {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-title::before {
  content: "📄";
  font-size: 14px;
}

.preview-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.download-btn {
  padding: 8px 16px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
  position: relative;
  overflow: hidden;
}

.download-btn::before {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  transition: left 0.6s ease;
}

.download-btn:hover::before {
  left: 100%;
}

.download-btn:hover {
  background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.close-btn {
  padding: 8px 12px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  border-radius: 8px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
}

.close-btn:hover {
  background: #f1f5f9;
  color: #333;
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.preview-content {
  flex: 1;
  overflow: auto;
  position: relative;
}

.preview-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  font-size: 16px;
  color: #666;
  z-index: 10;
}

.preview-loading::before {
  content: "";
  width: 24px;
  height: 24px;
  border: 3px solid #e0e0e0;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 12px;
}

.preview-body {
  height: 100%;
  overflow: auto;
  padding: 24px;
  box-sizing: border-box;
  min-height: 50vh;
}

/* 文本/代码 */
.code-pre {
  margin: 0;
  padding: 24px;
  background: #1e293b;
  color: #f8fafc;
  border-radius: 12px;
  overflow: auto;
  max-height: 70vh;
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  font-size: 14px;
  line-height: 1.5;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.3);
  border: 1px solid #334155;
}

.code-pre code {
  font-family: inherit;
}

/* 媒体容器（居中显示） */
.media-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  background: #0f172a;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.media-container::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(
    circle at 50% 50%,
    rgba(255, 255, 255, 0.05) 0%,
    transparent 70%
  );
  pointer-events: none;
}

.media-container img,
.media-container video {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.media-container img:hover,
.media-container video:hover {
  transform: scale(1.02);
}

/* PDF 查看器 */
.pdf-viewer {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 8px;
  min-height: 80vh;
}

/* Office 预览样式 */
.office-preview {
  padding: 24px;
  background: white;
  line-height: 1.6;
  border-radius: 12px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
}

.office-preview table {
  border-collapse: collapse;
  width: 100%;
  margin: 16px 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  overflow: hidden;
}

.office-preview td,
.office-preview th {
  border: 1px solid #e2e8f0;
  padding: 10px 16px;
  text-align: left;
  transition: all 0.2s ease;
}

.office-preview th {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  font-weight: 600;
  color: #334155;
  border-bottom: 2px solid #cbd5e1;
}

.office-preview tr:hover td {
  background: #f8fafc;
}

/* 不支持提示 */
.unsupported {
  text-align: center;
  padding: 60px 20px;
  color: #666;
  font-size: 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  margin: 20px;
  position: relative;
  overflow: hidden;
}

.unsupported::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(
    circle at 50% 50%,
    rgba(59, 130, 246, 0.08) 0%,
    transparent 70%
  );
}

.unsupported p {
  margin: 16px 0;
  position: relative;
  z-index: 1;
}

.unsupported::after {
  content: "⚠️";
  font-size: 48px;
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  opacity: 0.1;
  z-index: 0;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .local-view {
    padding: 16px;
  }

  .local-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 20px;
  }

  .header-title {
    font-size: 20px;
  }

  .btn-group {
    width: 100%;
    flex-direction: column;
  }

  .select-dir-btn {
    width: 100%;
    padding: 14px;
    text-align: center;
  }

  .file-tree-container {
    padding: 20px;
    max-height: 60vh;
  }

  .preview-modal {
    width: 95%;
    max-height: 95vh;
  }

  .preview-header {
    padding: 16px 20px;
  }

  .preview-body {
    padding: 20px;
  }

  .code-pre {
    padding: 20px;
    font-size: 13px;
  }

  .media-container img,
  .media-container video {
    max-height: 70vh;
  }

  .empty-btn-group {
    flex-direction: column;
    width: 100%;
  }

  .empty-reload-btn {
    width: 100%;
    padding: 12px;
    text-align: center;
  }
}

@media (max-width: 480px) {
  .local-header {
    padding: 16px;
  }

  .header-title {
    font-size: 18px;
  }

  .select-dir-btn {
    padding: 12px;
    font-size: 14px;
  }

  .file-tree-container {
    padding: 16px;
    max-height: 50vh;
  }

  .preview-modal {
    width: 98%;
  }

  .preview-header {
    padding: 12px 16px;
  }

  .preview-title {
    font-size: 14px;
  }

  .preview-body {
    padding: 16px;
  }

  .code-pre {
    padding: 16px;
    font-size: 12px;
  }

  .unsupported {
    padding: 40px 16px;
  }
}

/* 动画 */
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes fadeIn {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

@keyframes slideIn {
  0% {
    transform: scale(0.9) translateY(-20px);
    opacity: 0;
  }
  100% {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}
</style>