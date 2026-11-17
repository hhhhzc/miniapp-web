import { test } from 'node:test';
import assert from 'node:assert/strict';
import { navigateToMiniProgram } from '../src/services/navigation.js';

test('missing or unsupported platform targets do not navigate', async () => {
  global.uni = {};
  await assert.rejects(navigateToMiniProgram({}), /不完整/);
  await assert.rejects(navigateToMiniProgram({ appId: 'app', path: 'path' }), /微信小程序/);
});

test('navigation uses only the backend-provided platform target', async () => {
  global.uni = {
    navigateToMiniProgram(options) {
      assert.equal(options.appId, 'documented-app-id');
      assert.equal(options.path, 'documented-path');
      options.success();
    },
  };
  await navigateToMiniProgram({ appId: 'documented-app-id', path: 'documented-path' });
});
