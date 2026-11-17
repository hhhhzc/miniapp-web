import { STORAGE_KEYS } from '../constants/storage.js';

function isValidSession(session) {
  return session && typeof session.token === 'string' && session.token.trim()
    && typeof session.user?.id === 'string' && session.user.id
    && Number.isFinite(Date.parse(session.expiresAt))
    && Date.parse(session.expiresAt) > Date.now();
}

export function getSession() {
  const session = uni.getStorageSync(STORAGE_KEYS.session);
  if (!session) return null;
  if (isValidSession(session)) return session;
  uni.removeStorageSync(STORAGE_KEYS.session);
  return null;
}

export function saveSession(session) {
  if (!isValidSession(session)) throw new Error('登录返回的数据不完整或已过期，请重新登录');
  uni.setStorageSync(STORAGE_KEYS.session, session);
}

export function clearSession(expectedToken) {
  const current = uni.getStorageSync(STORAGE_KEYS.session);
  if (expectedToken !== undefined && current?.token !== expectedToken) return;
  uni.removeStorageSync(STORAGE_KEYS.session);
}
