<script setup>
/** 通用活动页：通过入口编号读取发布配置，用户点击按钮后才打开目标小程序。 */
import { computed, ref } from 'vue';
import { onLoad, onShow, onPullDownRefresh } from '@dcloudio/uni-app';
import { getEntry } from '../../services/api.js';
import { resolveImageUrl } from '../../services/home.js';
import { navigateToMiniProgram } from '../../services/navigation.js';
import { useAsyncResource } from '../../composables/useAsyncResource.js';

const entryId = ref(0);
const busy = ref(false);
const failedImage = ref(false);
const {
  data: entry,
  loading,
  error,
  load,
} = useAsyncResource(async () => {
  failedImage.value = false;
  if (!Number.isSafeInteger(entryId.value) || entryId.value <= 0) {
    throw new Error('活动地址无效，请返回首页重新打开');
  }
  return getEntry(entryId.value);
});
const image = computed(() => {
  if (!entry.value || failedImage.value) return '';
  return resolveImageUrl(entry.value.detailImageUrl || entry.value.imageUrl);
});
const available = computed(
  () => entry.value?.targetType === 'MINIPROGRAM' && Boolean(entry.value.appId)
);

async function openTarget() {
  if (busy.value || loading.value || !available.value) return;
  // #ifndef MP-WEIXIN
  uni.showToast({ title: '请在微信小程序中领取', icon: 'none' });
  return;
  // #endif
  // #ifdef MP-WEIXIN
  busy.value = true;
  try {
    await navigateToMiniProgram(entry.value);
  } catch (failure) {
    if (failure.code !== 'NAVIGATION_CANCELLED') {
      uni.showToast({ title: failure.message, icon: 'none' });
    }
  } finally {
    busy.value = false;
  }
  // #endif
}

onLoad(options => {
  entryId.value = Number(options?.id);
});
// 从目标小程序返回或重新进入时刷新，避免继续展示已经下架的入口。
onShow(load);
onPullDownRefresh(async () => {
  try {
    await load();
  } finally {
    uni.stopPullDownRefresh();
  }
});
</script>

<template>
  <view class="activity-page">
    <view
      v-if="loading"
      class="state-card"
    >
      <view class="state-title">正在加载活动…</view>
      <text class="muted">好优惠马上就到</text>
    </view>
    <view
      v-else-if="error"
      class="state-card"
    >
      <view class="state-title">暂时无法查看活动</view>
      <text class="muted">{{ error }}</text>
      <button
        class="retry-button"
        @click="load"
      >
        重新加载
      </button>
    </view>
    <template v-else-if="entry">
      <view class="activity-card">
        <image
          v-if="image"
          class="activity-image"
          :src="image"
          mode="widthFix"
          @error="failedImage = true"
        />
        <view
          v-else
          class="image-placeholder"
        >
          {{ entry.iconText || '券' }}
        </view>
        <view class="activity-body">
          <text
            v-if="entry.badge"
            class="badge"
          >
            {{ entry.badge }}
          </text>
          <view class="activity-title">{{ entry.title }}</view>
          <view
            v-if="entry.subtitle"
            class="activity-subtitle"
          >
            {{ entry.subtitle }}
          </view>
          <view class="content-heading">活动说明</view>
          <text
            class="activity-content"
            selectable
          >
            {{ entry.detailContent || '点击下方按钮，前往平台查看当前活动及领取规则。' }}
          </text>
        </view>
      </view>
      <view class="action-bar">
        <text class="action-hint">优惠及使用规则以平台活动页面为准</text>
        <button
          class="claim-button"
          :disabled="busy || !available"
          :loading="busy"
          @click="openTarget"
        >
          {{ available ? entry.buttonText || '立即领取' : '活动暂未开放' }}
        </button>
      </view>
    </template>
  </view>
</template>

<style scoped>
.activity-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 28rpx 28rpx calc(210rpx + env(safe-area-inset-bottom));
  background: #f7f6f2;
  color: #29291f;
}
.activity-card,
.state-card {
  overflow: hidden;
  border-radius: 30rpx;
  background: #fff;
}
.activity-image {
  display: block;
  width: 100%;
}
.image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 270rpx;
  background: #fff0ae;
  color: #996208;
  font-size: 96rpx;
}
.activity-body {
  padding: 36rpx;
}
.badge {
  display: inline-block;
  padding: 8rpx 18rpx;
  border-radius: 12rpx;
  background: #fff0ae;
  color: #996208;
  font-size: 22rpx;
}
.activity-title {
  margin-top: 20rpx;
  font-size: 42rpx;
  font-weight: 700;
  line-height: 1.45;
  overflow-wrap: break-word;
}
.activity-subtitle {
  margin-top: 16rpx;
  color: #76766b;
  font-size: 28rpx;
  line-height: 1.7;
}
.content-heading {
  margin: 40rpx 0 18rpx;
  padding-top: 30rpx;
  border-top: 1rpx solid #efeee8;
  font-size: 28rpx;
  font-weight: 600;
}
.activity-content {
  display: block;
  color: #626257;
  font-size: 28rpx;
  line-height: 1.9;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid #efeee8;
}
.action-hint {
  display: block;
  margin-bottom: 16rpx;
  color: #929286;
  text-align: center;
  font-size: 22rpx;
}
.claim-button,
.retry-button {
  border-radius: 20rpx;
  background: #ffe168;
  color: #493905;
  font-size: 30rpx;
  font-weight: 600;
}
.claim-button::after,
.retry-button::after {
  border: 0;
}
.claim-button[disabled] {
  background: #efeee8;
  color: #929286;
}
.state-card {
  padding: 64rpx 36rpx;
  text-align: center;
}
.state-title {
  margin-bottom: 20rpx;
  font-size: 32rpx;
  font-weight: 600;
}
.muted {
  color: #929286;
  font-size: 26rpx;
  line-height: 1.7;
}
.retry-button {
  margin-top: 36rpx;
}
</style>
