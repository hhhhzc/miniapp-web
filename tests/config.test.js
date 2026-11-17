import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApiConfiguration, normalizeBaseUrl } from '../src/config.js';
import { STORAGE_KEYS } from '../src/constants/storage.js';
import { activeSession, installUni } from './helpers/uni.js';

function configuration(environment) {
  const state = installUni();
  return {
    ...state,
    config: createApiConfiguration(environment, {
      get: key => state.values.get(key),
      set: (key, value) => state.values.set(key, value),
      remove: key => state.values.delete(key)
    })
  };
}

test('validates server origins and rejects credentials, paths and invalid ports', () => {
  assert.equal(normalizeBaseUrl(' https://api.example.com/ '), 'https://api.example.com');
  for (const value of ['', 'file:///tmp', 'https://user:secret@example.com', 'https://a.com/path', 'http://localhost:99999']) {
    assert.throws(() => normalizeBaseUrl(value));
  }
});

test('changing the development server clears its session; the same origin keeps it', () => {
  const { config, values } = configuration({ DEV: true, UNI_PLATFORM: 'mp-weixin' });
  values.set(STORAGE_KEYS.session, activeSession());
  assert.equal(config.setBaseUrl('http://127.0.0.1:8080/'), 'http://127.0.0.1:8080');
  assert.ok(values.has(STORAGE_KEYS.session));
  config.setBaseUrl('http://192.168.1.10:8080');
  assert.ok(!values.has(STORAGE_KEYS.session));
});

test('an empty development address resets H5 to its same-origin proxy', () => {
  const { config, values } = configuration({ DEV: true, UNI_PLATFORM: 'h5' });
  config.setBaseUrl('http://192.168.1.10:8080');
  values.set(STORAGE_KEYS.session, activeSession());
  assert.equal(config.setBaseUrl('  '), '');
  assert.equal(config.getRequestUrl('/api/v1/coupons'), '/api/v1/coupons');
  assert.ok(!values.has(STORAGE_KEYS.session));
  assert.ok(!values.has(STORAGE_KEYS.apiBaseUrl));
});

test('production ignores development overrides and hides development login', () => {
  const { config, values } = configuration({
    DEV: false, UNI_PLATFORM: 'mp-weixin', VITE_API_BASE_URL: 'https://api.example.com/', VITE_ENABLE_DEV_LOGIN: 'true'
  });
  values.set(STORAGE_KEYS.apiBaseUrl, 'http://127.0.0.1:8080');
  assert.equal(config.getBaseUrl(), 'https://api.example.com');
  assert.equal(config.showDevelopmentLogin, false);
  assert.throws(() => config.setBaseUrl('http://localhost:8080'));
});

test('production WeChat requests require an API origin; H5 may use same-origin routing', () => {
  const wechat = configuration({ DEV: false, UNI_PLATFORM: 'mp-weixin' }).config;
  assert.throws(() => wechat.getRequestUrl('/api/v1/coupons'), /VITE_API_BASE_URL/);
  const h5 = configuration({ DEV: false, UNI_PLATFORM: 'h5' }).config;
  assert.equal(h5.getRequestUrl('/api/v1/coupons'), '/api/v1/coupons');
  assert.throws(() => h5.getRequestUrl('//outside.example.com'));
});
