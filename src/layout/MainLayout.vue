<template>
  <div class="main-layout">
    <!-- 头部区域 -->
    <header class="layout-header">
      <slot name="header"></slot>
    </header>
    <div class="layout-body">
      <!-- 左侧菜单 -->
      <aside class="layout-left">
        <slot name="left"></slot>
      </aside>
      <!-- 主内容区 -->
      <main class="layout-main">
        <slot name="main"></slot>
      </main>
    </div>
  </div>
</template>

<style scoped>
.main-layout {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
}

.layout-header {
  height: 70px;
  line-height: 70px;
  padding: 0 30px;
  background: linear-gradient(135deg, #409eff 0%, #1d4ed8 100%);
  color: white;
  border-bottom: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.layout-header::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 3px;
  background: linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%);
}

.layout-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  box-shadow: inset 0 4px 12px rgba(0, 0, 0, 0.05);
}

.layout-left {
  width: 220px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-right: 1px solid #e2e8f0;
  padding: 20px 0;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.layout-left:hover {
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.08);
}

.layout-main {
  flex: 1;
  overflow-y: auto;
  background-color: #f5f7fa;
  transition: all 0.3s ease;
}

.layout-main:hover {
  background-color: #f8fafc;
}

/* 滚动条样式优化 */
.layout-main::-webkit-scrollbar {
  width: 8px;
}

.layout-main::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.layout-main::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%);
  border-radius: 4px;
  transition: all 0.3s ease;
}

.layout-main::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%);
}

/* 响应式适配 */
@media (max-width: 768px) {
  .layout-header {
    height: 60px;
    line-height: 60px;
    padding: 0 20px;
  }
  
  .layout-left {
    width: 180px;
    padding: 16px 0;
  }
}

@media (max-width: 480px) {
  .layout-header {
    height: 56px;
    line-height: 56px;
    padding: 0 16px;
  }
  
  .layout-left {
    width: 160px;
    padding: 12px 0;
  }
}
</style>