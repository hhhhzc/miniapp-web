import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequestClient, request } from '../src/services/request.js';
import { getSession, clearSession } from '../src/services/session.js';
import { STORAGE_KEYS } from '../src/constants/storage.js';
import { activeSession, installUni } from './helpers/uni.js';

test('public requests do not carry a logged-in user token', async () => {
  const { requests } = installUni({ [STORAGE_KEYS.session]: activeSession() });
  const pending = request('/api/v1/home');
  assert.equal(requests[0].header.Authorization, undefined);
  requests[0].success({ statusCode: 200, data: { code: '0000', data: [] } });
  assert.deepEqual(await pending, []);
});

test('protected requests require login before sending any network request', async () => {
  const { requests } = installUni();
  await assert.rejects(
    request('/api/v1/users/me', { auth: true }),
    error => error.code === 'UNAUTHORIZED'
  );
  assert.equal(requests.length, 0);
});

test('authenticated JSON requests accept a successful HTTP 201 envelope', async () => {
  const { requests } = installUni({ [STORAGE_KEYS.session]: activeSession('token') });
  const pending = request('/api/v1/test', { auth: true, method: 'POST', data: { id: 'one' } });
  assert.equal(requests[0].header.Authorization, 'Bearer token');
  assert.equal(requests[0].timeout, 10000);
  assert.deepEqual(requests[0].data, { id: 'one' });
  requests[0].success({ statusCode: 201, data: { code: '0000', data: { trackingId: 'one' } } });
  assert.equal((await pending).trackingId, 'one');
});

test('an old 401 cannot clear a newer login session', async () => {
  const { values, requests } = installUni({ [STORAGE_KEYS.session]: activeSession('old') });
  const pending = request('/api/v1/users/me', { auth: true });
  const rejected = assert.rejects(pending, error => error.code === 'SESSION_CHANGED');
  values.set(STORAGE_KEYS.session, activeSession('new'));
  requests[0].success({ statusCode: 401, data: { code: 'UNAUTHORIZED' } });
  await rejected;
  assert.equal(getSession().token, 'new');
});

test('an old successful private response is discarded after logout', async () => {
  const { requests } = installUni({ [STORAGE_KEYS.session]: activeSession() });
  const pending = request('/api/v1/users/me', { auth: true });
  const rejected = assert.rejects(pending, error => error.code === 'SESSION_CHANGED');
  clearSession();
  requests[0].success({ statusCode: 200, data: { code: '0000', data: [{ id: 'private-order' }] } });
  await rejected;
});

test('a 401 for the current session clears it and reports authentication failure', async () => {
  const { requests } = installUni({ [STORAGE_KEYS.session]: activeSession() });
  const pending = request('/api/v1/users/me', { auth: true });
  const rejected = assert.rejects(pending, error => error.code === 'UNAUTHORIZED');
  requests[0].success({ statusCode: 401, data: { code: 'UNAUTHORIZED', message: 'expired' } });
  await rejected;
  assert.equal(getSession(), null);
});

test('responses from a previous API origin cannot update current data', async () => {
  let origin = 'http://127.0.0.1:8080';
  let outgoing;
  const client = createRequestClient({
    getBaseUrl: () => origin,
    getRequestUrl: path => origin + path,
    getSession: () => null,
    clearSession() {},
    send(options) {
      outgoing = options;
    },
  });
  const pending = client('/api/v1/home');
  const rejected = assert.rejects(pending, error => error.code === 'CONTEXT_CHANGED');
  origin = 'https://api.example.com';
  outgoing.success({ statusCode: 200, data: { code: '0000', data: [] } });
  await rejected;
});

test('business errors, invalid envelopes and timeouts remain visible to callers', async () => {
  for (const response of [
    { statusCode: 503, data: { code: 'INTEGRATION_NOT_CONFIGURED', message: 'pending' } },
    { statusCode: 200, data: '<html>bad gateway</html>' },
  ]) {
    const { requests } = installUni();
    const pending = request('/api/v1/test');
    const rejected = assert.rejects(pending);
    requests[0].success(response);
    await rejected;
  }
  const { requests } = installUni();
  const pending = request('/api/v1/test');
  const rejected = assert.rejects(pending, /超时/);
  requests[0].fail({ errMsg: 'timeout' });
  await rejected;
});
