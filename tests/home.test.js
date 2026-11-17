import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterModules, resolveImageUrl } from '../src/services/home.js';
import { navigateToMiniProgram } from '../src/services/navigation.js';

test('home search respects publication status and hides empty or unknown modules', () => {
  const entries = [
    { title: '滴滴出行', subtitle: '打车', enabled: true },
    { title: '美团外卖', enabled: false },
  ];
  const modules = [
    { title: '服务', layout: 'GRID', enabled: true, entries },
    { title: '停用', layout: 'GRID', enabled: false, entries },
    { layout: 'SCRIPT', enabled: true, entries },
  ];
  assert.equal(filterModules(modules, '').length, 1);
  assert.deepEqual(filterModules(modules, '打车')[0].entries, [entries[0]]);
  assert.deepEqual(filterModules(modules, '美团'), []);
  assert.deepEqual(filterModules(null, ''), []);
});
test('unsafe image schemes and arbitrary local paths are rejected', () => {
  assert.equal(resolveImageUrl('javascript:alert(1)'), '');
  assert.equal(resolveImageUrl('//example.com/tracker'), '');
  assert.equal(resolveImageUrl('/admin/config'), '');
  assert.equal(resolveImageUrl('https://example.com/icon.png'), 'https://example.com/icon.png');
});
test('homepage targets support empty path and pass extraData unchanged', async () => {
  global.uni = {
    navigateToMiniProgram(options) {
      assert.equal(options.path, '');
      assert.equal(options.envVersion, 'release');
      assert.deepEqual(options.extraData, { campaign: 'x' });
      options.success();
    },
  };
  await navigateToMiniProgram({ appId: 'wx1234567890abcdef', extraData: { campaign: 'x' } });
});
test('user cancelling a jump is distinguishable from a navigation failure', async () => {
  global.uni = {
    navigateToMiniProgram: options => options.fail({ errMsg: 'navigateToMiniProgram:fail cancel' }),
  };
  await assert.rejects(
    navigateToMiniProgram({ appId: 'wx1234567890abcdef' }),
    e => e.code === 'NAVIGATION_CANCELLED'
  );
});
