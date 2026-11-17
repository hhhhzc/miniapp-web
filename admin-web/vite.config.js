/** 管理端独立构建配置；复用 Vue 完整构建以编译页面模板，产物部署到 /admin/。 */
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: '/admin/',
  resolve: { alias: { vue: 'vue/dist/vue.esm-bundler.js' } },
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
  },
  server: {
    host: '127.0.0.1',
    port: 5174,
    proxy: { '/api': 'http://127.0.0.1:8080', '/media': 'http://127.0.0.1:8080' },
  },
  build: { outDir: '../dist/admin', emptyOutDir: true },
});
