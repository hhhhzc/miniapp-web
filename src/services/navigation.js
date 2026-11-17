export function navigateToPromotion(target) {
  if (!target?.appId || !target?.path) return Promise.reject(new Error('平台跳转信息不完整'));
  if (typeof uni.navigateToMiniProgram !== 'function') {
    return Promise.reject(new Error('请在微信小程序中打开平台'));
  }
  return new Promise((resolve, reject) => uni.navigateToMiniProgram({
    appId: target.appId, path: target.path,
    success: resolve,
    fail: () => reject(new Error('未能打开平台小程序，请稍后重试'))
  }));
}
