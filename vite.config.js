import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    }
  },
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      },
      // 告诉 Rollup 不打包 Node.js 模块（交给 Utools 预加载）
      external: ['fs', 'path', 'fs-extra']
    }
  },
  // 注入 process 变量，解决浏览器环境未定义问题
  define: {
    'process.env': process.env,
    'process': process
  }
})