<!-- 隐私说明页：说明按需登录、第三方跳转和用户可选择的操作。 -->
<template>
  <view class="page privacy">
    <view class="title">隐私说明</view>
    <view class="card">
      <view class="section-title">按需登录</view>
      <view class="copy">
        你可以直接浏览和打开服务入口。主动使用微信登录时，我们通过微信提供的身份标识识别你在券小站的账号，并保存登录会话。微信登录不会让你自动登录其他平台。
      </view>
    </view>
    <view class="card">
      <view class="section-title">服务入口</view>
      <view class="copy">
        点击入口后将打开对应平台的小程序。目标平台的服务、活动条件及个人信息处理，以该平台的说明为准。本版不通过跳转获取你的平台订单。
      </view>
    </view>
    <view class="card">
      <view class="section-title">你的选择</view>
      <view class="copy">
        本版不要求提供手机号、微信头像或昵称。你可以在“我的”中退出本机登录，清除本机保存的登录凭证。正式隐私保护指引请通过微信小程序菜单查看。
      </view>
    </view>
  </view>
</template>
<style scoped>
.copy {
  font-size: 27rpx;
  line-height: 1.9;
  color: #747b85;
  margin-top: 22rpx;
}
.privacy {
  padding-bottom: 70rpx;
}
</style>
