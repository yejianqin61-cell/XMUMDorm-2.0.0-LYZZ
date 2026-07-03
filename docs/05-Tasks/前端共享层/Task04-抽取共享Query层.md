# Task04-抽取共享Query层

## 目标

统一两套前端的 Query key 与缓存策略实现。

## 范围

- `queryClient.js`
- `queryKeys.js`

## 要求

- 共享后保留现有缓存时长和 retry 策略
- 不改变页面查询行为

## 验证

- `npm run build:web`
- `npm run build:app`
- `npm run build:capacitor`

## 提交规范

建议 commit：

```text
refactor(shared): extract shared query configuration
```
