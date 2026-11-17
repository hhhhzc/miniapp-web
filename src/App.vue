<script setup>
import { onLaunch } from '@dcloudio/uni-app';
onLaunch(() => {});
</script>
<style>
page { background: #f7f6f2; color: #262e2b; font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif; font-size: 28rpx; }
view, text, button, input { box-sizing: border-box; }
button::after { border: 0; }
button { margin: 0; font-size: 27rpx; border-radius: 18rpx; }
.page { padding: 34rpx 32rpx 64rpx; }
.eyebrow { color: #9b8057; font-size: 22rpx; letter-spacing: 4rpx; margin-bottom: 14rpx; }
.title { font-size: 48rpx; font-weight: 750; letter-spacing: 1rpx; }
.subtitle { color: #91928b; font-size: 25rpx; line-height: 1.8; margin-top: 16rpx; }
.card { background: white; border: 1rpx solid #ecebe5; border-radius: 28rpx; padding: 30rpx; margin-top: 24rpx; }
.row { display: flex; justify-content: space-between; align-items: center; }
.section-title { font-size: 31rpx; font-weight: 650; }
.muted { color: #96998e; font-size: 24rpx; line-height: 1.8; }
.primary { color: #302a1b; background: #f5cf70; font-weight: 600; line-height: 86rpx; }
.primary[disabled] { color: #9b967e; background: #eee8d5; }
.secondary { color: #74623e; background: #f5f1e7; line-height: 76rpx; margin-top: 20rpx; }
.empty { padding: 64rpx 24rpx; color: #92968b; text-align: center; line-height: 1.9; }
.error { color: #a15a47; background: #fff0e9; padding: 22rpx; margin-top: 24rpx; border-radius: 18rpx; font-size: 25rpx; line-height: 1.8; overflow-wrap: break-word; }
</style>
