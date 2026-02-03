<template>
  <div class="left-menu">
    <ul class="menu-list">
      <li 
        v-for="menu in menus" 
        :key="menu.key"
        :class="['menu-item', { active: activeKey === menu.key }]"
        @click="handleClick(menu.key)"
      >
        {{ menu.name }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'
import { useRouter } from 'vue-router'

// 初始化路由实例
const router = useRouter()

// 接收父组件传参
const props = defineProps({
  activeKey: {
    type: String,
    required: true,
    default: 'github'
  },
  menus: {
    type: Array,
    required: true,
    default: () => []
  }
})

// 定义事件
const emit = defineEmits(['change'])

// 菜单点击事件
const handleClick = (key) => {
  emit('change', key)
  // 路由跳转
  router.push({ name: key })
}
</script>

<style scoped>
.menu-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.menu-item {
  padding: 14px 24px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 500;
  transition: all 0.3s ease;
  border-radius: 0 12px 12px 0;
  margin: 4px 0;
  position: relative;
  overflow: hidden;
  color: #4b5563;
}

.menu-item:hover {
  background: linear-gradient(135deg, #e8f3ff 0%, #d9ecff 100%);
  transform: translateX(8px);
  color: #1d4ed8;
  box-shadow: 0 4px 12px rgba(64, 150, 255, 0.15);
}

.menu-item.active {
  background: linear-gradient(135deg, #409eff 0%, #1d4ed8 100%);
  color: white;
  transform: translateX(8px);
  box-shadow: 0 4px 12px rgba(64, 150, 255, 0.3);
  font-weight: 600;
}

.menu-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 4px;
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
}

.menu-item::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, rgba(64, 150, 255, 0.1) 0%, transparent 100%);
  transform: translateX(-100%);
  transition: transform 0.3s ease;
}

.menu-item:hover::after,
.menu-item.active::after {
  transform: translateX(0);
}

/* 响应式适配 */
@media (max-width: 768px) {
  .menu-item {
    padding: 12px 20px;
    font-size: 14px;
  }
  
  .menu-item:hover,
  .menu-item.active {
    transform: translateX(4px);
  }
}

@media (max-width: 480px) {
  .menu-item {
    padding: 10px 16px;
    font-size: 13px;
  }
}
</style>