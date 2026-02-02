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
}

.layout-header {
  height: 60px;
  line-height: 60px;
  padding: 0 20px;
  background: #409eff;
  color: white;
  border-bottom: 1px solid #e5e7eb;
}

.layout-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.layout-left {
  width: 200px;
  background: #f9fafb;
  border-right: 1px solid #e5e7eb;
  padding: 10px 0;
}

.layout-main {
  flex: 1;
  overflow-y: auto;
}
</style>