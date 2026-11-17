import { STORAGE_KEYS } from './constants/storage.js';

const LOCAL_API_ORIGIN = 'http://127.0.0.1:8080';

export function normalizeBaseUrl(value) {
  const origin = String(value || '').trim().replace(/\/+$/, '');
  if (!/^https?:\/\/[a-zA-Z0-9.-]+(?::\d{1,5})?$/.test(origin)) {
    throw new Error('请输入有效的 HTTP 或 HTTPS 服务器地址');
  }
  const port = origin.match(/:(\d+)$/);
  if (port && (Number(port[1]) < 1 || Number(port[1]) > 65535)) {
    throw new Error('端口号无效');
  }
  return origin;
}

export function createApiConfiguration(environment, storage) {
  const development = environment.DEV === true;
  const platform = environment.UNI_PLATFORM || 'h5';

  function getBaseUrl() {
    if (development) {
      const saved = storage.get(STORAGE_KEYS.apiBaseUrl);
      if (saved) return normalizeBaseUrl(saved);
    }
    if (environment.VITE_API_BASE_URL?.trim()) {
      return normalizeBaseUrl(environment.VITE_API_BASE_URL);
    }
    if (platform === 'h5') return '';
    return development ? LOCAL_API_ORIGIN : '';
  }

  function setBaseUrl(value) {
    if (!development) throw new Error('接口地址只能在开发环境调整');
    const origin = String(value || '').trim() ? normalizeBaseUrl(value) : '';
    const previous = getBaseUrl();
    if (origin) storage.set(STORAGE_KEYS.apiBaseUrl, origin);
    else storage.remove(STORAGE_KEYS.apiBaseUrl);
    const current = getBaseUrl();
    if (current !== previous) storage.remove(STORAGE_KEYS.session);
    return current;
  }

  function getRequestUrl(path) {
    if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) {
      throw new Error('接口路径必须是站内路径');
    }
    const origin = getBaseUrl();
    if (!origin && platform !== 'h5') {
      throw new Error('请先配置生产接口地址 VITE_API_BASE_URL');
    }
    return origin + path;
  }

  return {
    getBaseUrl,
    setBaseUrl,
    getRequestUrl,
    showDevelopmentLogin: development && environment.VITE_ENABLE_DEV_LOGIN === 'true'
  };
}

const configuration = createApiConfiguration(import.meta.env || {}, {
  get: key => uni.getStorageSync(key),
  set: (key, value) => uni.setStorageSync(key, value),
  remove: key => uni.removeStorageSync(key)
});

export const getBaseUrl = () => configuration.getBaseUrl();
export const setBaseUrl = value => configuration.setBaseUrl(value);
export const getRequestUrl = path => configuration.getRequestUrl(path);
export const showDevelopmentLogin = configuration.showDevelopmentLogin;
