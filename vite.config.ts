import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 关键配置：设置为相对路径，适配 GitHub Pages 的 /repo-name/ 路径
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});