/** 统一请求适配器：处理认证、业务响应、超时以及切换账号或服务器后的过期响应。 */
import { getBaseUrl, getRequestUrl } from '../config.js';
import { getSession, clearSession } from './session.js';

/** 通过依赖注入构造请求客户端，便于 uni 环境调用和独立测试。 */
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

      /** 请求完成时重新检查服务器和账号，阻止旧环境响应覆盖当前页面。 */
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
          ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
        },
        success(response) {
          if (contextChanged()) return;
          const body = response.data;
          if (response.statusCode >= 200 && response.statusCode < 300 && body?.code === '0000') {
            resolve(body.data);
            return;
          }
          if (response.statusCode === 401 && session) clearSession(session.token);
          reject(
            requestError(
              body?.message || `请求失败（${response.statusCode}）`,
              body?.code || 'HTTP_ERROR'
            )
          );
        },
        fail(error) {
          if (contextChanged()) return;
          const timeout = String(error.errMsg).includes('timeout');
          reject(
            requestError(
              timeout ? '连接超时，请重试' : '无法连接后端，请检查接口地址和服务状态',
              'NETWORK_ERROR'
            )
          );
        },
      });
    });
  };
}

export const request = createRequestClient({
  getBaseUrl,
  getRequestUrl,
  getSession,
  clearSession,
  send: options => uni.request(options),
});

/** 保留可读文案和稳定错误码，供页面按场景展示或分支处理。 */
function requestError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}
