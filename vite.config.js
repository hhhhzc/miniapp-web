/** 小程序/H5 开发构建配置；本地 API 和图片请求代理到同一后端。 */
import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';

export default defineConfig({
  plugins: [(typeof uni === 'function' ? uni : uni.default)()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8080', changeOrigin: true },
      '/media': { target: 'http://127.0.0.1:8080', changeOrigin: true },
    },
  },
});
