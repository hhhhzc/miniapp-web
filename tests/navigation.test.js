import { test } from 'node:test';
import assert from 'node:assert/strict';
import { navigateToMiniProgram, openEntry } from '../src/services/navigation.js';

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

test('legacy and direct entries preserve the exact mini program target', async () => {
  const calls = [];
  global.uni = {
    navigateToMiniProgram(options) {
      calls.push(options);
      options.success();
    },
    navigateTo() {
      assert.fail('direct entries must not open the activity page');
    },
  };
  const target = {
    id: 12,
    targetType: 'MINIPROGRAM',
    appId: 'wx1234567890abcdef',
    path: 'pages/coupon?id=123',
    extraData: { channel: 'test' },
  };
  await openEntry(target);
  await openEntry({ ...target, openMode: 'DIRECT' });
  assert.equal(calls.length, 2);
  for (const options of calls) {
    assert.equal(options.appId, target.appId);
    assert.equal(options.path, target.path);
    assert.deepEqual(options.extraData, target.extraData);
    assert.equal(options.envVersion, 'release');
  }
});

test('detail entries open an internal page by id without launching the target', async () => {
  let called = false;
  global.uni = {
    navigateTo(options) {
      called = true;
      assert.equal(options.url, '/pages/activity/index?id=12');
      options.success();
    },
    navigateToMiniProgram() {
      assert.fail('activity must wait for the user to click its button');
    },
  };
  await openEntry({
    id: 12,
    targetType: 'MINIPROGRAM',
    appId: 'wx1234567890abcdef',
    openMode: 'DETAIL',
  });
  assert.equal(called, true);
});

test('invalid activity configurations never navigate', async () => {
  global.uni = {
    navigateTo() {
      assert.fail('invalid entry must not navigate');
    },
    navigateToMiniProgram() {
      assert.fail('invalid entry must not navigate');
    },
  };
  const target = {
    id: 12,
    targetType: 'MINIPROGRAM',
    appId: 'wx1234567890abcdef',
    openMode: 'DETAIL',
  };
  await assert.rejects(openEntry({ ...target, id: '12&appId=other' }), /活动信息不完整/);
  await assert.rejects(openEntry({ ...target, id: -1 }), /活动信息不完整/);
  await assert.rejects(openEntry({ ...target, targetType: 'NONE' }), /不完整/);
  await assert.rejects(openEntry({ ...target, openMode: 'UNKNOWN' }), /打开方式无效/);
});

test('navigation errors remain retryable and cancellation is distinguished', async () => {
  global.uni = {
    navigateTo(options) {
      options.fail();
    },
    navigateToMiniProgram(options) {
      options.fail({ errMsg: 'navigateToMiniProgram:fail cancel' });
    },
  };
  await assert.rejects(
    openEntry({
      id: 1,
      appId: 'wx1234567890abcdef',
      targetType: 'MINIPROGRAM',
      openMode: 'DETAIL',
    }),
    /活动页打开失败/
  );
  await assert.rejects(navigateToMiniProgram({ appId: 'wx1234567890abcdef' }), {
    code: 'NAVIGATION_CANCELLED',
  });
});
