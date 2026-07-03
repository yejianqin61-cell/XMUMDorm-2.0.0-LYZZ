# Task03-抽取共享常量与纯工具层

## 目标

将稳定、无页面布局耦合的常量与纯工具层抽取到共享目录。

## 范围

### constants

- `canteen.js`
- `levelConfig.js`
- `rating.js`

### utils

- `apiError.js`
- `formatTime.js`
- `formatTodoDue.js`
- `nestComments.js`
- `regionCode.js`
- `schedulePersist.js`
- `scrollCache.js`

## 不包含

- `capacitor.js`
- `fullscreen.js`
- `imagePicker.js`
- `motion.js`

这些属于第二批环境相关工具，不在本任务内。

## 验证

- `npm run build:web`
- `npm run build:app`
- `npm run build:capacitor`

## 提交规范

建议 commit：

```text
refactor(shared): extract shared constants and pure utils
```
