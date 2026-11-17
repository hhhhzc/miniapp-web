<script setup>
import { ref } from 'vue';
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app';
import { getOrders } from '../../services/api.js';
import { getSession } from '../../services/session.js';
import { formatAmount, formatTime, platformName, statusName } from '../../utils/format.js';
import { useAsyncResource } from '../../composables/useAsyncResource.js';

const loggedIn = ref(false);
const { data: orders, loading, error, load: refreshOrders, reset } = useAsyncResource(getOrders, {
  initialValue: () => []
});

async function load() {
  loggedIn.value = !!getSession();
  if (!loggedIn.value) {
    reset();
    return;
  }
  await refreshOrders();
  loggedIn.value = !!getSession();
}

function login() {
  uni.switchTab({ url: '/pages/profile/index' });
}

onShow(load);
onPullDownRefresh(async () => {
  try { await load(); } finally { uni.stopPullDownRefresh(); }
});
</script>
<template>
  <view class="page">
    <view class="eyebrow">YOUR ORDERS, IN ONE PLACE</view><view class="title">每一单，都有记录。</view>
    <view class="subtitle">这里展示由平台同步且已归属到你的订单。</view>
    <view v-if="!loggedIn" class="card empty"><view>登录后查看你的订单记录</view><button class="secondary" @click="login">去登录</button></view>
    <view v-if="error" class="error">{{ error }}<button v-if="loggedIn" class="secondary" @click="load">重新加载</button></view>
    <view v-if="loading" class="empty">正在读取订单…</view>
    <view v-else-if="loggedIn && !error && !orders.length" class="card empty"><view class="empty-mark">▤</view><view>暂时没有已同步订单</view><view class="muted">平台回传可能有延迟，领券点击不会生成订单。</view></view>
    <view v-for="order in orders" :key="order.id" class="card">
      <view class="row"><text class="platform">{{ platformName(order.platform) }}</text><text class="status">{{ statusName(order.status) }}</text></view>
      <view class="merchant">{{ order.merchantName }}</view>
      <view class="row"><text class="muted">订单金额</text><text class="amount">¥ {{ formatAmount(order.amountFen) }}</text></view>
      <view class="order-meta">订单号 {{ order.platformOrderNo }}</view><view class="order-meta">{{ formatTime(order.placedAt) }}</view>
    </view>
    <view class="notice">当前联盟订单同步适配器待接入。页面仅展示真实入库记录，不会生成演示订单。</view>
  </view>
</template>
<style scoped>
.empty-mark { font-size: 80rpx; color: #d3bd80; margin-bottom: 20rpx; }.platform { color: #a48847; font-size: 25rpx; }.status { color: #808f7e; font-size: 23rpx; background: #f1f5ee; border-radius: 10rpx; padding: 6rpx 14rpx; }.merchant { font-size: 32rpx; font-weight: 650; margin: 28rpx 0; }.amount { font-size: 36rpx; font-weight: 700; }.order-meta { font-size: 22rpx; color: #a0a292; margin-top: 16rpx; overflow-wrap: break-word; }.notice { color: #aaa99c; font-size: 22rpx; line-height: 1.8; margin-top: 34rpx; }
</style>
