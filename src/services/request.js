import { getBaseUrl, getRequestUrl } from '../config.js';
import { getSession, clearSession } from './session.js';

export function createRequestClient({ getBaseUrl, getRequestUrl, getSession, clearSession, send }) {
  return function request(path, options = {}) {
    return new Promise((resolve, reject) => {
      const origin = getBaseUrl();
      const url = getRequestUrl(path);
      const session = options.auth ? getSession() : null;
      if (options.auth && !session) {
        reject(requestError('请先登录', 'UNAUTHORIZED'));
        return;
      }

      function contextChanged() {
        if (origin !== getBaseUrl()) {
          reject(requestError('接口地址已变化，请重新加载', 'CONTEXT_CHANGED'));
          return true;
        }
        if (options.auth && getSession()?.token !== session.token) {
          reject(requestError('登录状态已变化，请重新加载', 'SESSION_CHANGED'));
          return true;
        }
        return false;
      }

      send({
        url,
        method: options.method || 'GET',
        data: options.data,
        timeout: 10000,
        header: {
          'content-type': 'application/json',
          ...(session ? { Authorization: `Bearer ${session.token}` } : {})
        },
        success(response) {
          if (contextChanged()) return;
          const body = response.data;
          if (response.statusCode >= 200 && response.statusCode < 300 && body?.code === '0000') {
            resolve(body.data);
            return;
          }
          if (response.statusCode === 401 && session) clearSession(session.token);
          reject(requestError(body?.message || `请求失败（${response.statusCode}）`, body?.code || 'HTTP_ERROR'));
        },
        fail(error) {
          if (contextChanged()) return;
          const timeout = String(error.errMsg).includes('timeout');
          reject(requestError(timeout ? '连接超时，请重试' : '无法连接后端，请检查接口地址和服务状态', 'NETWORK_ERROR'));
        }
      });
    });
  };
}

export const request = createRequestClient({
  getBaseUrl,
  getRequestUrl,
  getSession,
  clearSession,
  send: options => uni.request(options)
});

function requestError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}
