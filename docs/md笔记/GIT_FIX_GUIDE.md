# Git 合并历史问题解决方案

## 问题描述

- GitHub 仓库有 README 的初始提交（因为你勾选了 Initialize with README）
- 本地代码提交到了 master 分支
- 两个历史不相关，需要合并

## 解决方案

### 方法 1：合并两个历史（推荐）

在 Jack 文件夹的终端执行：

```bash
# 1. 先拉取远程的 README 提交（允许不相关历史）
git pull origin master --allow-unrelated-histories

# 2. 如果有冲突，解决冲突后：
git add .
git commit -m "合并本地和远程历史"

# 3. 推送到 GitHub
git push -u origin master
```

### 方法 2：如果 GitHub 是 main 分支

```bash
# 1. 拉取远程的 main 分支
git pull origin main --allow-unrelated-histories

# 2. 如果有冲突，解决冲突
git add .
git commit -m "合并本地和远程历史"

# 3. 推送到 GitHub
git push -u origin main
```

### 方法 3：强制推送（不推荐，会覆盖远程 README）

```bash
# ⚠️ 警告：这会覆盖 GitHub 上的 README
git push -u origin master --force
```

## 推荐使用方法 1

执行以下命令：

```bash
git pull origin master --allow-unrelated-histories
```

如果有冲突，Git 会提示你解决冲突。
