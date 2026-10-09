# Phase 4 Task 01 · lint warning 基线

日期：2026-10-09  
范围：`app/src/**/*.{ts,tsx}`  
结论：**0 errors / 311 warnings，312 个文件完成扫描。**

## 1. 原始命令

```text
cd app
npm.cmd run lint
```

结果：退出成功；Expo lint 输出 `0 errors and 311 warnings`。本次没有修改 lint 配置或源代码。

## 2. 按规则聚合

| 规则 | 数量 |
|---|---:|
| `@typescript-eslint/no-require-imports` | 158 |
| `react-hooks/refs` | 46 |
| `react-hooks/set-state-in-effect` | 23 |
| `@typescript-eslint/no-unused-vars` | 21 |
| `import/first` | 20 |
| `react-hooks/exhaustive-deps` | 18 |
| `import/no-duplicates` | 10 |
| 配置诊断 | 6 |
| `@typescript-eslint/array-type` | 3 |
| `unicode-bom` | 2 |
| `react-hooks/globals` | 2 |
| `react-hooks/immutability` | 2 |

聚合方式：使用项目已安装的 ESLint API 重新扫描并按 `ruleId` 计数；不是从截断的终端输出估算。

## 3. 告警最多的文件

| 文件 | 数量 |
|---|---:|
| `src/__tests__/p1-17-canteen.test.tsx` | 20 |
| `src/features/errand/ErrandScreens.tsx` | 16 |
| `src/__tests__/p1-14-tools-school-systems.test.tsx` | 16 |
| `src/features/campus/CampusScreens.tsx` | 15 |
| `src/__tests__/p1-13-auth-session.test.tsx` | 13 |
| `src/features/marketplace/MarketScreens.tsx` | 12 |
| `src/__tests__/p1-15-schedule-import.test.tsx` | 12 |
| `src/__tests__/p2x-bing-campus.test.tsx` | 11 |
| `src/features/guides/GuidesScreens.tsx` | 10 |
| `src/__tests__/live-api-layer.test.ts` | 10 |

## 4. 处理顺序

第一批优先选择可机械、安全验证的 `import/no-duplicates`、`import/first`、`unicode-bom` 和明确未使用导入。`no-require-imports` 与 React hooks 规则需要逐文件判断，不能批量关闭或机械替换。

该基线把历史记录中的约 217–220 warning 更新为当前真实值 311；后续每批报告相对本基线的变化。
