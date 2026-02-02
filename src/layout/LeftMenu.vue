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
  padding: 10px 20px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.menu-item:hover {
  background: #e8f3ff;
}

.menu-item.active {
  background: #409eff;
  color: white;
}
</style>