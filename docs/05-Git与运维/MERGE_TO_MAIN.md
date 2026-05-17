# 将 master 分支合并到 main 分支

## 目标
- 只保留 main 分支
- 将 master 分支的所有内容合并到 main
- 推送到 GitHub

## 完整步骤

### 步骤 1：创建并切换到 main 分支

```bash
# 基于当前的 master 创建 main 分支
git checkout -b main
```

或者：

```bash
# 重命名 master 为 main
git branch -M main
```

### 步骤 2：拉取远程 main 分支（如果有 README）

```bash
# 拉取远程的 main 分支，合并不相关的历史
git pull origin main --allow-unrelated-histories
```

### 步骤 3：如果有冲突，解决冲突

```bash
# 查看冲突
git status

# 解决冲突后
git add .
git commit -m "合并 master 到 main，合并本地和远程历史"
```

### 步骤 4：推送到 GitHub

```bash
# 推送到 GitHub 的 main 分支
git push -u origin main
```

### 步骤 5：删除本地的 master 分支（可选）

```bash
# 切换到 main 分支（如果还没切换）
git checkout main

# 删除 master 分支
git branch -d master
```

### 步骤 6：删除远程的 master 分支（如果存在）

```bash
# 删除远程的 master 分支
git push origin --delete master
```

## 快速命令（推荐）

```bash
# 1. 重命名 master 为 main
git branch -M main

# 2. 拉取远程 main（合并 README）
git pull origin main --allow-unrelated-histories

# 3. 如果有冲突，解决后提交
# git add .
# git commit -m "合并历史"

# 4. 推送到 GitHub
git push -u origin main

# 5. 删除远程 master（如果存在）
git push origin --delete master
```
