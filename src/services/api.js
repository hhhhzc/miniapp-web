/** 业务接口目录；个人数据显式开启用户鉴权，公共首页允许游客读取。 */
import { request } from './request.js';

/** 读取公开首页模块树，不携带用户 Token。 */
export const getHome = () => request('/api/v1/home');

/** 读取当前会话对应的公开用户信息。 */
export const getMe = () => request('/api/v1/users/me', { auth: true });

/** 检查后端基础连接状态。 */
export const getHealth = () => request('/api/v1/system/health');

/** 仅 local 后端提供的共享体验登录入口。 */
export const developmentLogin = () => request('/api/v1/auth/dev-login', { method: 'POST' });

/** 将微信临时 code 交给后端完成身份交换。 */
export const wechatLogin = code =>
  request('/api/v1/auth/wechat-login', { method: 'POST', data: { code } });
