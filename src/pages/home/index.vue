<script setup>
import { ref } from 'vue';
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app';
import { getCoupons, createPromotion } from '../../services/api.js';
import { getSession } from '../../services/session.js';
import { navigateToPromotion } from '../../services/navigation.js';
import { useAsyncResource } from '../../composables/useAsyncResource.js';

const { data: coupons, loading, error, load } = useAsyncResource(getCoupons, { initialValue: () => [] });
const busyId = ref('');

async function claim(coupon) {
  if (busyId.value) return;
  if (!coupon.configured) {
    uni.showToast({ title: '平台推广接口待接入', icon: 'none' });
    return;
  }
  // #ifndef MP-WEIXIN
  uni.showToast({ title: '请在微信小程序中打开平台', icon: 'none' });
  return;
  // #endif
  // #ifdef MP-WEIXIN
  if (!getSession()) {
    uni.switchTab({ url: '/pages/profile/index' });
    return;
  }
  busyId.value = coupon.id;
  try {
    const target = await createPromotion(coupon.id);
    await navigateToPromotion(target);
  } catch (failure) {
    uni.showToast({ title: failure.message, icon: 'none', duration: 3000 });
  } finally {
    busyId.value = '';
  }
  // #endif
}

onShow(load);
onPullDownRefresh(async () => {
  try { await load(); } finally { uni.stopPullDownRefresh(); }
});
</script>

<template>
  <view class="page">
    <view class="row"><view class="brand">券小站<text class="brand-dot">·</text></view><text class="brand-note">每一餐，都值得</text></view>
    <view class="hero">
      <view class="eyebrow">YOUR DAILY LITTLE SAVINGS</view>
      <view class="hero-title"><view>先领券，</view><view>再享受好好吃饭。</view></view>
      <view class="hero-note">平台活动一站直达 · 订单随时可查</view>
      <view class="ticket-art"><text class="ticket-symbol">券</text><view class="ticket-caption"><view>今天也要</view><view>吃点好的</view></view></view>
    </view>
    <view class="steps"><text>01 选择平台</text><text class="step-arrow">→</text><text>02 领券下单</text><text class="step-arrow">→</text><text>03 查看订单</text></view>
    <view class="heading row"><text class="section-title">今日领券入口</text><text class="muted">优惠以平台为准</text></view>
    <view v-if="loading" class="empty">正在加载活动…</view>
    <view v-if="error" class="error">{{ error }}<button class="secondary" @click="load">重新加载</button></view>
    <view v-for="coupon in coupons" :key="coupon.id" class="card coupon-card">
      <view class="row">
        <view class="platform-icon" :class="coupon.platform">{{ coupon.platform === 'meituan' ? '美' : '饿' }}</view>
        <view class="coupon-info"><view class="coupon-title">{{ coupon.title }}</view><view class="muted">{{ coupon.platformName }} · 外卖优惠</view></view>
      </view>
      <view class="coupon-description">{{ coupon.description }}</view>
      <view class="coupon-bottom row"><text class="integration-status">{{ coupon.configured ? '点击前往平台领券' : '联盟接口待接入' }}</text><button class="claim" :disabled="!coupon.configured || !!busyId" :loading="busyId === coupon.id" @click="claim(coupon)">{{ coupon.configured ? '去领券 →' : '待接入' }}</button></view>
    </view>
    <view v-if="!loading && !error && !coupons.length" class="empty">暂时没有可用活动</view>
    <view class="footnote">订单将在平台回传后展示，点击领券不会生成订单。</view>
  </view>
</template>

<style scoped>
.brand { font-size: 34rpx; font-weight: 750; }.brand-dot { color: #d2a847; margin-left: 8rpx; }.brand-note { font-size: 23rpx; color: #9c9c8f; }
.hero { position: relative; overflow: hidden; padding: 40rpx 32rpx; margin-top: 34rpx; border-radius: 32rpx; background: #efe6c9; }
.hero .eyebrow { font-size: 18rpx; letter-spacing: 2rpx; position: relative; z-index: 2; }.hero-title { font-size: 45rpx; font-weight: 750; line-height: 1.55; position: relative; z-index: 2; }.hero-note { color: #9e8751; font-size: 23rpx; margin-top: 24rpx; }
.ticket-art { position: absolute; right: -30rpx; top: 65rpx; width: 210rpx; height: 228rpx; background: #f9f3df; border: 4rpx solid #e3c575; border-radius: 22rpx; transform: rotate(12deg); text-align: center; padding-top: 24rpx; }.ticket-symbol { display: block; font-size: 68rpx; font-weight: bold; color: #c59d44; }.ticket-caption { color: #ad975f; font-size: 22rpx; line-height: 1.5; }
.steps { display: flex; justify-content: space-between; margin: 30rpx 0 48rpx; font-size: 21rpx; color: #858b7b; }.step-arrow { color: #c8b274; }.heading { margin-bottom: 28rpx; }
.coupon-card { padding: 28rpx; }.platform-icon { width: 82rpx; height: 82rpx; border-radius: 22rpx; text-align: center; line-height: 82rpx; font-size: 38rpx; font-weight: 700; }.meituan { background: #ffdb65; color: #473d21; }.eleme { background: #e1f3ff; color: #1895db; }.coupon-info { flex: 1; margin-left: 24rpx; }.coupon-title { font-size: 29rpx; font-weight: 650; margin-bottom: 10rpx; }.coupon-description { margin-top: 26rpx; font-size: 24rpx; color: #95988b; line-height: 1.8; }.coupon-bottom { border-top: 1rpx dashed #eceadd; padding-top: 22rpx; margin-top: 26rpx; }.integration-status { font-size: 23rpx; color: #a39162; }.claim { background: #f5cf70; color: #4a3912; padding: 0 26rpx; line-height: 66rpx; font-size: 24rpx; }.claim[disabled] { background: #f0eee6; color: #aaa89c; }.footnote { color: #a8aa9e; font-size: 21rpx; text-align: center; line-height: 1.8; margin-top: 40rpx; }
</style>
