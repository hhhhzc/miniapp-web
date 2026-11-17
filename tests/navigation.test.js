import { test } from 'node:test';
import assert from 'node:assert/strict';
import { navigateToPromotion } from '../src/services/navigation.js';
import { formatAmount } from '../src/utils/format.js';

test('missing or unsupported platform targets do not navigate', async () => {
  global.uni = {};
  await assert.rejects(navigateToPromotion({}), /不完整/);
  await assert.rejects(navigateToPromotion({ appId: 'app', path: 'path' }), /微信小程序/);
});

test('navigation uses only the backend-provided platform target', async () => {
  global.uni = {
    navigateToMiniProgram(options) {
      assert.equal(options.appId, 'documented-app-id');
      assert.equal(options.path, 'documented-path');
      options.success();
    },
  };
  await navigateToPromotion({ appId: 'documented-app-id', path: 'documented-path' });
});

test('money is displayed from integer fen', () => {
  assert.equal(formatAmount(1234), '12.34');
  assert.equal(formatAmount(0), '0.00');
});
