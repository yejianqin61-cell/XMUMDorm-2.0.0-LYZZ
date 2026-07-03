# Task05-共享层验证与目录收口

## 目标

完成第一批共享层抽取后的验证、目录清理与文档收口。

## 范围

- 统一检查 `frontend/` 与 `frontend-app/` 是否已正确引用共享层
- 删除或收口第一批已完成共享的重复文件
- 更新共享层说明文档

## 重点检查

- API 导入路径是否全部切换完成
- constants / utils / query 是否仍有遗留双份源文件
- 两端构建是否仍可通过

## 验证

- `npm run build:web`
- `npm run build:app`
- `npm run build:capacitor`
- 必要时抽查关键页面

## 提交规范

建议 commit：

```text
chore(shared): finalize first-pass shared layer cleanup
```
