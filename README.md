# 超星学习通 自动助手

自动静音二倍速播放，视频结束跳下一节，考试页可跳过或通知。

## 安装

1. 安装 [Tampermonkey](https://www.tampermonkey.net/)
2. 新建脚本，粘贴 `chaoxing-auto-study.user.js` 全部内容
3. 打开超星课程 `mooc1.chaoxing.com/mycourse/studentstudy`

## 功能

视频页始终自动处理：静音 → 2x 速度 → 播放 → 结束后自动下一节。

| 开关 | 考试页行为 |
|---|---|
| ON | 自动跳过 |
| OFF | 浏览器通知 |

额外处理：弹窗自动关闭、防切后台暂停、模拟人类点击间隔。

## 更新

脚本头部填入你的仓库地址：

```javascript
// @updateURL    https://raw.githubusercontent.com/你的用户名/你的仓库/main/chaoxing-auto-study.user.js
// @downloadURL  https://raw.githubusercontent.com/你的用户名/你的仓库/main/chaoxing-auto-study.user.js
```

改 `@version` 后 push，Tampermonkey 自动提示更新。

## 许可

MIT
