export function activeSession(token = 'session-token') {
  return {
    token,
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    user: { id: `user-${token}`, displayName: '测试用户', development: true },
  };
}

export function installUni(initial = {}) {
  const values = new Map(Object.entries(initial));
  const requests = [];
  global.uni = {
    getStorageSync: key => values.get(key) || '',
    setStorageSync: (key, value) => values.set(key, value),
    removeStorageSync: key => values.delete(key),
    request: options => requests.push(options),
  };
  return { values, requests, uni: global.uni };
}
