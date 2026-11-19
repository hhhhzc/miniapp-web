/** 平台跳转适配器，使用后台提供的目标参数，并区分用户取消与真实失败。 */

/** 旧配置默认直接跳转；活动页只传入口编号，由详情接口读取最新发布配置。 */
export function openEntry(entry) {
  if (entry?.targetType !== 'MINIPROGRAM' || !entry.appId) {
    return Promise.reject(new Error('平台跳转信息不完整'));
  }
  if (!entry.openMode || entry.openMode === 'DIRECT') return navigateToMiniProgram(entry);
  if (entry.openMode !== 'DETAIL') return Promise.reject(new Error('入口打开方式无效'));
  if (!Number.isSafeInteger(entry.id) || entry.id <= 0) {
    return Promise.reject(new Error('活动信息不完整，请刷新首页'));
  }
  return new Promise((resolve, reject) => {
    uni.navigateTo({
      url: `/pages/activity/index?id=${entry.id}`,
      success: resolve,
      fail: () => reject(new Error('活动页打开失败，请稍后重试')),
    });
  });
}

/** 只在微信支持的环境打开目标，空 path 打开首页，正式运行统一跳转 release 版本。 */
export function navigateToMiniProgram(target) {
  if (!target?.appId) return Promise.reject(new Error('平台跳转信息不完整'));
  if (typeof uni.navigateToMiniProgram !== 'function') {
    return Promise.reject(new Error('请在微信小程序中打开平台'));
  }
  return new Promise((resolve, reject) =>
    uni.navigateToMiniProgram({
      appId: target.appId,
      path: target.path || '',
      extraData: target.extraData || {},
      envVersion: 'release',
      success: resolve,
      fail: failure => {
        const cancelled = String(failure?.errMsg).includes('cancel');
        const error = new Error(cancelled ? '已取消打开' : '未能打开平台小程序，请稍后重试');
        error.code = cancelled ? 'NAVIGATION_CANCELLED' : 'NAVIGATION_FAILED';
        reject(error);
      },
    })
  );
}
