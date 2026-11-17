<script setup>
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { getMe, getHealth, wechatLogin, developmentLogin } from '../../services/api.js';
import { getSession, saveSession, clearSession } from '../../services/session.js';
import { getBaseUrl, setBaseUrl, showDevelopmentLogin } from '../../config.js';
import { useAsyncResource } from '../../composables/useAsyncResource.js';

const { data: user, loading: accountLoading, error: accountError, load: refreshAccount, reset: resetAccount } = useAsyncResource(getMe);
const busy = ref(false);
const actionError = ref('');
const baseUrl = ref('');
const result = ref('');
const error = computed(() => actionError.value || accountError.value);

onShow(async () => {
  actionError.value = '';
  result.value = '';
  resetAccount();
  try {
    baseUrl.value = getBaseUrl();
    if (getSession()) await refreshAccount();
  } catch (failure) {
    actionError.value = failure.message;
  }
});

async function login(development = false) {
  if (busy.value || accountLoading.value) return;
  busy.value = true;
  actionError.value = '';
  resetAccount();
  try {
    let session;
    if (development) {
      session = await developmentLogin();
    } else {
      // #ifdef MP-WEIXIN
      const credentials = await new Promise((resolve, reject) => uni.login({
        provider: 'weixin', success: resolve, fail: reject
      }));
      session = await wechatLogin(credentials.code);
      // #endif
      // #ifndef MP-WEIXIN
      throw new Error('微信登录请在微信小程序中使用');
      // #endif
    }
    saveSession(session);
    resetAccount(session.user);
  } catch (failure) {
    actionError.value = failure.message || '登录失败，请重试';
  } finally {
    busy.value = false;
  }
}

function logout() {
  clearSession();
  resetAccount();
  actionError.value = '';
}

async function saveConnection() {
  if (busy.value || accountLoading.value) return;
  busy.value = true;
  actionError.value = '';
  result.value = '';
  try {
    baseUrl.value = setBaseUrl(baseUrl.value);
    resetAccount(getSession()?.user || null);
    const health = await getHealth();
    if (health.status !== 'UP') throw new Error('服务状态异常');
    result.value = '地址已保存，后端连接成功';
  } catch (failure) {
    actionError.value = failure.message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <view class="page">
    <view class="eyebrow">A LITTLE MORE FOR YOU</view><view class="title">我的券小站。</view>
    <view class="card account">
      <view class="avatar">券</view>
      <view class="user-name">{{ user ? user.displayName : '你好，欢迎来领券' }}</view>
      <view class="muted">{{ user?.development ? '当前为本地开发体验账号，非真实微信身份' : (user ? '平台订单会归属到你的账号' : '登录后，查看属于你的订单记录') }}</view>
      <button v-if="!user" class="primary login-button" :disabled="busy || accountLoading" :loading="busy || accountLoading" @click="login(false)">微信登录</button>
      <button v-if="!user && showDevelopmentLogin" class="secondary" :disabled="busy || accountLoading" @click="login(true)">开发体验登录（仅本地）</button>
      <button v-if="user" class="secondary" @click="logout">退出本机登录</button>
    </view>
    <view v-if="error" class="error">{{ error }}</view>
    <view v-if="showDevelopmentLogin" class="card">
      <view class="section-title">开发连接设置</view><view class="muted connection-hint">H5 默认走同源代理，无需填写；微信模拟器可使用 127.0.0.1。</view>
      <input v-model="baseUrl" class="url-input" placeholder="http://127.0.0.1:8080" :disabled="busy || accountLoading"/>
      <button class="secondary" :disabled="busy || accountLoading" @click="saveConnection">保存并检查连接</button><view v-if="result" class="result">{{ result }}</view>
    </view>
    <view class="card"><view class="section-title">关于领券和订单</view><view class="about muted">优惠券由对应平台发放，活动内容与使用条件以平台为准。订单仅在联盟回传、校验并完成归属后展示。</view></view>
  </view>
</template>
<style scoped>
.account { text-align: center; padding: 40rpx 30rpx; }.avatar { width: 112rpx; height: 112rpx; border-radius: 38rpx; background: #f5e5b8; color: #9c7b2d; font-size: 50rpx; font-weight: bold; line-height: 112rpx; margin: 0 auto 24rpx; }.user-name { font-size: 34rpx; font-weight: 650; margin-bottom: 18rpx; }.login-button { margin-top: 32rpx; }.url-input { height: 84rpx; border-radius: 14rpx; padding: 0 20rpx; background: #f7f6f1; margin-top: 24rpx; font-size: 25rpx; }.connection-hint, .about { margin-top: 22rpx; }.result { margin-top: 22rpx; color: #5e8863; font-size: 25rpx; }
</style>
