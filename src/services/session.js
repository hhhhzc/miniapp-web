/** 本站用户会话存储；校验有效期，并防止过期请求清除新会话。 */
import { STORAGE_KEYS } from '../constants/storage.js';

/** 校验必要字段和过期时间，损坏或过期会话不再参与认证。 */
function isValidSession(session) {
  return (
    session &&
    typeof session.token === 'string' &&
    session.token.trim() &&
    Number.isInteger(session.user?.id) &&
    session.user.id > 0 &&
    Number.isFinite(Date.parse(session.expiresAt)) &&
    Date.parse(session.expiresAt) > Date.now()
  );
}

/** 读取有效会话，并主动清理无效的本地记录。 */
export function getSession() {
  const session = uni.getStorageSync(STORAGE_KEYS.session);
  if (!session) return null;
  if (isValidSession(session)) return session;
  uni.removeStorageSync(STORAGE_KEYS.session);
  return null;
}

/** 先验证登录响应，再覆盖本机保存的会话。 */
export function saveSession(session) {
  if (!isValidSession(session)) throw new Error('登录返回的数据不完整或已过期，请重新登录');
  uni.setStorageSync(STORAGE_KEYS.session, session);
}

/** 传入旧 Token 时只清理匹配会话，避免旧 401 影响后来登录的账号。 */
export function clearSession(expectedToken) {
  const current = uni.getStorageSync(STORAGE_KEYS.session);
  if (expectedToken !== undefined && current?.token !== expectedToken) return;
  uni.removeStorageSync(STORAGE_KEYS.session);
}
