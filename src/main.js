/** 小程序应用入口：创建 uni-app 所需的 Vue 应用实例。 */
import { createSSRApp } from 'vue';
import App from './App.vue';
export function createApp() {
  return { app: createSSRApp(App) };
}
