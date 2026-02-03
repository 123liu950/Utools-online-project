<template>
  <div class="header-container">
    <h1 class="header-title">多平台项目查看器</h1>
  </div>
</template>

<style scoped>
.header-container {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 20px;
  position: relative;
  overflow: hidden;
}

.header-container::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%, rgba(255, 255, 255, 0.1) 100%);
  transform: translateX(-100%);
  transition: transform 0.6s ease;
}

.header-container:hover::before {
  transform: translateX(100%);
}

.header-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, #ffffff 0%, #e6f0ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
}

.header-container:hover .header-title {
  transform: translateY(-2px);
  text-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

/* 响应式适配 */
@media (max-width: 768px) {
  .header-container {
    padding: 0 16px;
  }
  
  .header-title {
    font-size: 18px;
  }
}

@media (max-width: 480px) {
  .header-title {
    font-size: 16px;
  }
}
</style>