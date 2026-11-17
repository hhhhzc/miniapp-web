<script setup>
/** 首页：读取后台模块配置，提供游客搜索及由用户点击触发的平台跳转。 */
import { computed, ref } from 'vue';
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app';
import { getHome } from '../../services/api.js';
import { navigateToPromotion } from '../../services/navigation.js';
import { filterModules, resolveImageUrl } from '../../services/home.js';
import { useAsyncResource } from '../../composables/useAsyncResource.js';
// 页面只维护展示状态，模块和入口的发布范围由后端公开接口决定。
const {
  data: modules,
  loading,
  error,
  load,
} = useAsyncResource(getHome, { initialValue: () => [] });
const keyword = ref(''),
  query = ref(''),
  busy = ref(false),
  failedImages = ref({});
const visible = computed(() => filterModules(modules.value, query.value));

/** 用户确认搜索后更新筛选词，输入过程不触发额外网络请求。 */
function search() {
  query.value = keyword.value.trim();
}

/** 同时清理输入值与筛选条件，恢复全部已发布模块。 */
function clearSearch() {
  keyword.value = '';
  query.value = '';
}

/** 图片加载失败后使用文字或图标回退，避免入口出现破损图片。 */
function image(entry) {
  return failedImages.value[entry.imageUrl] ? '' : resolveImageUrl(entry.imageUrl);
}

/** 记录失败的图片地址，同一次页面展示中切换为备用图标。 */
function imageFailed(entry) {
  failedImages.value = { ...failedImages.value, [entry.imageUrl]: true };
}

/** 仅使用已加载的目标发起跳转，未配置入口给出正常提示；游客无需先登录。 */
async function open(entry) {
  if (busy.value) return;
  if (entry.targetType !== 'MINIPROGRAM' || !entry.appId) {
    uni.showToast({ title: '这个入口即将开放，敬请期待', icon: 'none' });
    return;
  }
  // #ifndef MP-WEIXIN
  uni.showToast({ title: '请在微信小程序中打开', icon: 'none' });
  return;
  // #endif
  // #ifdef MP-WEIXIN
  busy.value = true;
  try {
    await navigateToPromotion(entry);
  } catch (failure) {
    if (failure.code !== 'NAVIGATION_CANCELLED')
      uni.showToast({ title: failure.message, icon: 'none' });
  } finally {
    busy.value = false;
  }
  // #endif
}
// 每次重新显示首页都获取最新配置，使后台改动在刷新后生效。
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
  <view class="home">
    <!-- 顶部品牌与搜索，搜索只筛选当前已加载的公开内容。 -->
    <view class="hero">
      <view class="hero-brand">
        <text class="brand">券小站</text>
        <text class="brand-label">生活好券，一站直达</text>
      </view>
      <view class="hero-title">
        把日常过得
        <text class="hero-emphasis">更划算</text>
      </view>
      <view class="hero-note">吃喝 · 出行 · 购物，发现生活里的小惊喜</view>
      <view class="search-box">
        <text class="search-icon">⌕</text>
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索美团、滴滴、咖啡…"
          confirm-type="search"
          @confirm="search"
        />
        <button
          class="search-button"
          @click="search"
        >
          搜索
        </button>
      </view>
    </view>
    <view class="content">
      <view
        v-if="error"
        class="notice"
      >
        <text>{{ error }}</text>
        <button
          class="retry"
          @click="load"
        >
          重新加载
        </button>
      </view>
      <view
        v-if="loading && !modules.length"
        class="loading-state"
      >
        <view class="skeleton" />
        <view class="skeleton" />
        <text>正在发现生活好券…</text>
      </view>
      <view
        v-if="query"
        class="search-summary"
      >
        <text>“{{ query }}”的搜索结果</text>
        <text
          class="clear-query"
          @click="clearSearch"
        >
          清除
        </text>
      </view>
      <view
        v-for="(module, index) in visible"
        :key="module.id"
        class="module"
        :class="{ 'first-grid': index === 0 && module.layout === 'GRID' && !query }"
      >
        <view
          v-if="!(index === 0 && module.layout === 'GRID' && !query)"
          class="module-heading"
        >
          <view class="module-title">{{ module.title }}</view>
          <text class="module-subtitle">{{ module.subtitle }}</text>
        </view>
        <!-- 固定三种布局由后台选择，入口内容与顺序完全来自配置。 -->
        <view
          v-if="module.layout === 'GRID'"
          class="icon-grid"
        >
          <button
            v-for="entry in module.entries"
            :key="entry.id"
            class="icon-entry"
            hover-class="entry-pressed"
            :aria-label="entry.title"
            @click="open(entry)"
          >
            <view
              class="icon-circle"
              :class="'theme-' + entry.theme"
            >
              <image
                v-if="image(entry)"
                class="entry-icon"
                :src="image(entry)"
                mode="aspectFill"
                @error="imageFailed(entry)"
              />
              <text
                v-else
                class="icon-letter"
              >
                {{ entry.iconText || entry.title.slice(0, 1) }}
              </text>
              <text
                v-if="entry.badge"
                class="icon-badge"
              >
                {{ entry.badge }}
              </text>
            </view>
            <text class="icon-title">{{ entry.title }}</text>
          </button>
        </view>
        <view
          v-else-if="module.layout === 'CARD'"
          class="promo-grid"
        >
          <button
            v-for="entry in module.entries"
            :key="entry.id"
            class="promo-entry"
            :class="'theme-' + entry.theme"
            hover-class="entry-pressed"
            @click="open(entry)"
          >
            <view class="promo-title">{{ entry.title }}</view>
            <view class="promo-subtitle">{{ entry.subtitle }}</view>
            <view class="promo-action">
              {{ entry.targetType === 'MINIPROGRAM' ? '去看看' : '敬请期待' }} ›
            </view>
            <image
              v-if="image(entry)"
              class="promo-art"
              :src="image(entry)"
              mode="aspectFill"
              @error="imageFailed(entry)"
            />
            <text
              v-else
              class="promo-emoji"
            >
              {{ entry.iconText || '券' }}
            </text>
          </button>
        </view>
        <swiper
          v-else-if="module.layout === 'BANNER'"
          class="banner-swiper"
          :indicator-dots="module.entries.length > 1"
          indicator-color="rgba(255,255,255,.45)"
          indicator-active-color="#fff"
          :autoplay="module.entries.length > 1"
          :interval="5000"
          circular
        >
          <swiper-item
            v-for="entry in module.entries"
            :key="entry.id"
          >
            <button
              class="banner-entry"
              :class="'theme-' + entry.theme"
              hover-class="entry-pressed"
              @click="open(entry)"
            >
              <image
                v-if="image(entry)"
                class="banner-image"
                :src="image(entry)"
                mode="aspectFill"
                @error="imageFailed(entry)"
              />
              <view
                v-if="image(entry)"
                class="banner-shade"
              />
              <view class="banner-copy">
                <text
                  v-if="entry.badge"
                  class="banner-badge"
                >
                  {{ entry.badge }}
                </text>
                <view class="banner-title">{{ entry.title }}</view>
                <view class="banner-subtitle">{{ entry.subtitle }}</view>
              </view>
              <text
                v-if="!image(entry)"
                class="banner-art"
              >
                {{ entry.iconText || '券' }}
              </text>
              <text class="banner-action">
                {{ entry.targetType === 'MINIPROGRAM' ? '立即前往' : '敬请期待' }} ›
              </text>
            </button>
          </swiper-item>
        </swiper>
      </view>
      <view
        v-if="!loading && !error && !visible.length"
        class="no-results"
      >
        <view class="empty-symbol">⌕</view>
        <view>{{ query ? '暂时没有找到相关入口' : '更多生活好去处，即将上线' }}</view>
        <text>下拉刷新，发现新的小惊喜</text>
      </view>
      <view class="home-footer">
        <view class="footer-rule" />
        <text>好好生活 · 每天都值得</text>
        <view class="footer-rule" />
      </view>
      <view class="terms">活动内容与使用条件以对应平台实际展示为准</view>
    </view>
  </view>
</template>
<style scoped>
/* 页面基线与顶部品牌区域 */
.home,
.hero,
.search-box,
.content,
.icon-grid,
.icon-entry,
.promo-entry,
.banner-entry {
  box-sizing: border-box;
}
/* #ifdef H5 */
.home {
  max-width: 430px;
  margin: 0 auto;
}
/* #endif */
.icon-entry::after,
.promo-entry::after,
.banner-entry::after,
.search-button::after {
  border: 0;
}
.home {
  min-height: 100vh;
  background: #f4f5f7;
  color: #20232b;
}
.hero {
  position: relative;
  overflow: hidden;
  padding: 40rpx 32rpx 90rpx;
  background: linear-gradient(135deg, #ffe66f, #ffcf29 65%, #ffbb19);
  border-radius: 0 0 44rpx 44rpx;
}
.hero::after {
  content: '';
  position: absolute;
  right: -60rpx;
  top: -150rpx;
  width: 380rpx;
  height: 380rpx;
  border: 64rpx solid #ffffff26;
  border-radius: 50%;
  pointer-events: none;
}
.hero-brand {
  display: flex;
  align-items: center;
  gap: 20rpx;
  position: relative;
  z-index: 1;
}
.brand {
  font-size: 42rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
}
.brand-label {
  font-size: 21rpx;
  color: #725500;
  border-left: 1rpx solid #b28c2d;
  padding-left: 20rpx;
}
.hero-title {
  font-size: 42rpx;
  font-weight: 750;
  margin-top: 38rpx;
  letter-spacing: 1rpx;
}
.hero-emphasis {
  color: #986005;
}
.hero-note {
  font-size: 23rpx;
  color: #81651c;
  margin-top: 10rpx;
}
/* 搜索输入与操作按钮 */
.search-box {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 60rpx;
  padding: 8rpx 8rpx 8rpx 26rpx;
  margin-top: 28rpx;
  box-shadow: 0 8rpx 26rpx #ba7d0020;
}
.search-icon {
  font-size: 42rpx;
  color: #a4a8b1;
  margin-right: 12rpx;
  line-height: 1;
}
.search-input {
  flex: 1;
  min-width: 0;
  font-size: 25rpx;
  height: 64rpx;
}
.search-button {
  border-radius: 50rpx;
  background: linear-gradient(130deg, #ffdd54, #ffbe18);
  padding: 0 32rpx;
  line-height: 64rpx;
  font-weight: 650;
  font-size: 26rpx;
  color: #523900;
}
/* 模块标题、宫格及入口图标 */
.content {
  position: relative;
  padding: 0 24rpx 38rpx;
}
.module {
  margin-top: 32rpx;
}
.first-grid {
  margin-top: -52rpx;
  position: relative;
  z-index: 2;
}
.module-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16rpx;
  margin: 0 4rpx 20rpx;
}
.module-title {
  font-size: 33rpx;
  font-weight: 750;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.module-title::before {
  content: '';
  width: 7rpx;
  height: 28rpx;
  background: linear-gradient(#ffd840, #ffa500);
  border-radius: 5rpx;
  margin-right: 12rpx;
}
.module-subtitle {
  font-size: 20rpx;
  color: #999ea8;
  text-align: right;
}
.icon-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx 0;
  background: #fff;
  border-radius: 30rpx;
  padding: 34rpx 10rpx 30rpx;
  box-shadow: 0 6rpx 24rpx #27314208;
}
.icon-entry {
  width: 20%;
  padding: 0;
  background: transparent;
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 15rpx;
  border-radius: 12rpx;
  overflow: visible;
  line-height: normal;
}
.icon-circle {
  position: relative;
  width: 92rpx;
  height: 92rpx;
  border-radius: 29rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 18rpx #a36e0015;
}
.icon-letter {
  font-size: 40rpx;
  font-weight: 800;
}
.entry-icon {
  width: 92rpx;
  height: 92rpx;
  border-radius: 29rpx;
}
.icon-title {
  font-size: 23rpx;
  color: #444850;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
.icon-badge {
  position: absolute;
  right: -8rpx;
  top: -10rpx;
  line-height: 26rpx;
  padding: 0 9rpx;
  border-radius: 12rpx 12rpx 12rpx 2rpx;
  background: #ff5244;
  color: white;
  font-size: 16rpx;
  box-shadow: 0 2rpx 6rpx #d9462430;
}
/* 后台允许选择的主题色 */
.theme-yellow {
  background: linear-gradient(135deg, #ffe689, #ffc938);
  color: #6d4800;
}
.theme-orange {
  background: linear-gradient(135deg, #ffe6ac, #ffb456);
  color: #7d430b;
}
.theme-blue {
  background: linear-gradient(135deg, #63b3ff, #2583ed);
  color: white;
}
.theme-red {
  background: linear-gradient(135deg, #ff8d7b, #f85152);
  color: white;
}
.theme-green {
  background: linear-gradient(135deg, #83d6a7, #36a77a);
  color: white;
}
.theme-purple {
  background: linear-gradient(135deg, #c7a6ff, #9773db);
  color: white;
}
/* 双列活动卡片 */
.promo-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 18rpx;
}
.promo-entry {
  position: relative;
  width: calc(50% - 9rpx);
  height: 226rpx;
  border-radius: 24rpx;
  padding: 26rpx 22rpx;
  overflow: hidden;
  text-align: left;
  line-height: normal;
}
.promo-title {
  position: relative;
  z-index: 1;
  font-size: 28rpx;
  font-weight: 750;
}
.promo-subtitle {
  position: relative;
  z-index: 1;
  font-size: 21rpx;
  margin-top: 9rpx;
  opacity: 0.8;
  max-width: 90%;
}
.promo-action {
  position: absolute;
  left: 22rpx;
  bottom: 22rpx;
  background: #ffffffec;
  color: #72501e;
  border-radius: 30rpx;
  padding: 8rpx 18rpx;
  font-size: 20rpx;
  z-index: 2;
}
.promo-emoji {
  position: absolute;
  bottom: 6rpx;
  right: 0;
  font-size: 86rpx;
  transform: rotate(-10deg);
  opacity: 0.8;
}
.promo-art {
  position: absolute;
  width: 120rpx;
  height: 120rpx;
  border-radius: 18rpx;
  right: 6rpx;
  bottom: 2rpx;
}
/* 轮播横幅与图片遮罩 */
.banner-swiper {
  height: 268rpx;
  border-radius: 28rpx;
  overflow: hidden;
}
.banner-entry {
  position: relative;
  height: 100%;
  width: 100%;
  padding: 30rpx 32rpx;
  text-align: left;
  line-height: normal;
  overflow: hidden;
  border-radius: 28rpx;
}
.banner-copy {
  position: relative;
  z-index: 2;
  max-width: 80%;
}
.banner-badge {
  display: inline-block;
  font-size: 18rpx;
  background: #ffffffdd;
  color: #a43b36;
  border-radius: 8rpx;
  padding: 6rpx 12rpx;
  margin-bottom: 16rpx;
}
.banner-title {
  font-size: 37rpx;
  font-weight: 800;
}
.banner-subtitle {
  font-size: 22rpx;
  margin-top: 12rpx;
  opacity: 0.9;
  max-width: 90%;
}
.banner-art {
  position: absolute;
  font-size: 110rpx;
  right: 32rpx;
  top: 64rpx;
  opacity: 0.8;
}
.banner-action {
  position: absolute;
  right: 26rpx;
  bottom: 26rpx;
  border-radius: 40rpx;
  background: white;
  color: #a54329;
  padding: 10rpx 20rpx;
  font-size: 22rpx;
  z-index: 3;
}
.banner-image,
.banner-shade {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
}
.banner-shade {
  background: linear-gradient(90deg, #0008, #0000);
}
.entry-pressed {
  opacity: 0.84;
  transform: scale(0.98);
}
/* 加载、错误、搜索空状态及底部说明 */
.notice {
  position: relative;
  z-index: 3;
  padding: 24rpx;
  background: #fff;
  border-radius: 20rpx;
  font-size: 25rpx;
  line-height: 1.7;
  color: #b64e3a;
}
.retry {
  margin-top: 16rpx;
  background: #fff2c2;
  color: #705411;
  line-height: 64rpx;
  font-size: 25rpx;
}
.search-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 4rpx 0;
  font-size: 25rpx;
  color: #747986;
}
.clear-query {
  color: #956a0b;
}
.loading-state {
  padding: 24rpx;
  color: #9299a5;
  text-align: center;
  font-size: 24rpx;
}
.skeleton {
  height: 150rpx;
  margin-bottom: 24rpx;
  border-radius: 24rpx;
  background: linear-gradient(100deg, #eee, #fff, #eee);
  background-size: 200%;
  animation: shine 1.6s infinite;
}
.no-results {
  text-align: center;
  padding: 80rpx 30rpx;
  color: #656c79;
  font-size: 27rpx;
  line-height: 2;
}
.no-results text {
  font-size: 22rpx;
  color: #9a9faa;
}
.empty-symbol {
  font-size: 70rpx;
  color: #d5b654;
}
.home-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  margin-top: 48rpx;
  color: #a5aab3;
  font-size: 22rpx;
  letter-spacing: 2rpx;
}
.footer-rule {
  width: 42rpx;
  height: 1rpx;
  background: #dcdfe3;
}
.terms {
  font-size: 19rpx;
  color: #b1b5be;
  text-align: center;
  margin-top: 14rpx;
}
@keyframes shine {
  to {
    background-position: -200%;
  }
}
</style>
