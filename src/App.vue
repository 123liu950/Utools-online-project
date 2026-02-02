<template>
  <MainLayout>
    <!-- 头部插槽 -->
    <template #header>
      <Head />
    </template>

    <!-- 左侧菜单插槽 -->
    <template #left>
      <LeftMenu 
        :active-key="activeKey" 
        :menus="menus" 
        @change="handleMenuChange"
      />
    </template>

    <!-- 主内容插槽 -->
    <template #main>
      <router-view/>
    </template>
  </MainLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
// 导入布局组件
import MainLayout from '@/layout/MainLayout.vue'
import Head from '@/layout/Head.vue'
import LeftMenu from '@/layout/LeftMenu.vue'
// 导入视图组件
import GithubView from '@/views/GithubView.vue'
import RenderView from '@/views/RenderView.vue'
import NpmView from '@/views/NpmView.vue'
import LocalView from '@/views/LocalView.vue'

// 菜单配置
const menus = ref([
  { key: 'settings', name: 'Settings' },
  { key: 'github', name: 'GitHub' },
  { key: 'render', name: 'Render' },
  { key: 'npm', name: 'NPM' },
  { key: 'local', name: 'Local' },
])

// 当前激活的菜单
const activeKey = ref('settings')

// 根据激活的菜单匹配对应组件
const currentView = computed(() => {
  switch (activeKey.value) {
    case 'github':
      return GithubView
    case 'render':
      return RenderView
    case 'npm':
      return NpmView
    case 'local':
      return LocalView
    default:
      return GithubView
  }
})

// 菜单切换事件
const handleMenuChange = (key) => {
  activeKey.value = key
}

// Utools 初始化
onMounted(() => {
  if (window.utools) {
    utools.setExpendHeight(700)
    utools.onPluginOut(window.utoolsPluginOut)
  }
})
</script>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Arial, sans-serif;
}
</style>