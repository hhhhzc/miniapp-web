import { request } from './request.js';
export const getCoupons = () => request('/api/v1/coupons');
export const getOrders = () => request('/api/v1/orders/me', { auth: true });
export const getMe = () => request('/api/v1/users/me', { auth: true });
export const getHealth = () => request('/api/v1/system/health');
export const developmentLogin = () => request('/api/v1/auth/dev-login', { method: 'POST' });
export const wechatLogin = code => request('/api/v1/auth/wechat-login', { method: 'POST', data: { code } });
export const createPromotion = id => request(`/api/v1/coupons/${encodeURIComponent(id)}/promotion`, {
  method: 'POST',
  auth: true
});
