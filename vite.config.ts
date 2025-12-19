import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 关键配置：设置为相对路径，适配 GitHub Pages 的 /repo-name/ 路径
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
    emptyOutDir: true, // 确保每次构建都清理输出目录
    rollupOptions: {
      output: {
        manualChunks: undefined // 禁用代码分割，确保文件更新
      }
    }
  }
});