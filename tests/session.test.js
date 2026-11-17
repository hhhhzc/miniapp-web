import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSession, saveSession, clearSession } from '../src/services/session.js';
import { STORAGE_KEYS } from '../src/constants/storage.js';
import { activeSession, installUni } from './helpers/uni.js';

test('valid sessions round-trip through uni storage', () => {
  installUni();
  const session = activeSession();
  saveSession(session);
  assert.deepEqual(getSession(), session);
});

test('expired and malformed sessions are discarded', () => {
  for (const invalid of [
    { token: 'incomplete' },
    { ...activeSession(), expiresAt: 'invalid' },
    { ...activeSession(), expiresAt: '2000-01-01T00:00:00Z' },
  ]) {
    const { values } = installUni({ [STORAGE_KEYS.session]: invalid });
    assert.equal(getSession(), null);
    assert.ok(!values.has(STORAGE_KEYS.session));
  }
});

test('invalid login responses cannot overwrite an existing valid session', () => {
  installUni({ [STORAGE_KEYS.session]: activeSession('current') });
  assert.throws(() => saveSession({ token: 'broken' }));
  assert.equal(getSession().token, 'current');
  clearSession('stale-token');
  assert.equal(getSession().token, 'current');
  clearSession('current');
  assert.equal(getSession(), null);
});
