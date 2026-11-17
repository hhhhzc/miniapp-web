import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectScope } from 'vue';
import { useAsyncResource } from '../src/composables/useAsyncResource.js';

function resource() {
  const pending = [];
  const scope = effectScope();
  const state = scope.run(() => useAsyncResource(() => new Promise((resolve, reject) => pending.push({ resolve, reject })), {
    initialValue: () => []
  }));
  return { scope, state, pending };
}

test('older responses cannot overwrite a newer completed refresh', async () => {
  const { state, pending } = resource();
  const old = state.load();
  const current = state.load();
  pending[1].resolve(['new']);
  await current;
  pending[0].resolve(['old']);
  await old;
  assert.deepEqual(state.data.value, ['new']);
  assert.equal(state.loading.value, false);
});

test('a stale failure cannot cancel the latest loading state or set its error', async () => {
  const { state, pending } = resource();
  const old = state.load();
  const current = state.load();
  pending[0].reject(new Error('stale'));
  await old;
  assert.equal(state.loading.value, true);
  assert.equal(state.error.value, '');
  pending[1].resolve(['current']);
  await current;
  assert.deepEqual(state.data.value, ['current']);
});

test('reset and scope disposal invalidate pending responses', async () => {
  const first = resource();
  const load = first.state.load();
  first.state.reset(['reset']);
  first.pending[0].resolve(['obsolete']);
  await load;
  assert.deepEqual(first.state.data.value, ['reset']);

  const second = resource();
  const disposed = second.state.load();
  second.scope.stop();
  second.pending[0].resolve(['obsolete']);
  await disposed;
  assert.deepEqual(second.state.data.value, []);
});

test('current failures clear data and expose an actionable error', async () => {
  const { state, pending } = resource();
  state.reset(['previous']);
  const current = state.load();
  pending[0].reject(new Error('offline'));
  await current;
  assert.deepEqual(state.data.value, []);
  assert.equal(state.error.value, 'offline');
  assert.equal(state.loading.value, false);
});
