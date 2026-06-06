# 用 Git/GitHub 回滚到之前版本 — 教程

当项目出问题需要回到之前的某个版本时，可以按下面几种方式操作。

---

## 一、先看清历史，找到要回滚到的版本

### 1. 查看提交历史

在项目根目录打开终端，执行：

```bash
git log --oneline
```

会看到类似：

```
a1b2c3d (HEAD -> main, origin/main) 最新提交说明
d4e5f6g 上一次提交说明
h7i8j9k 更早的提交说明
...
```

- **HEAD** 表示当前所在提交
- 每行前面的短哈希（如 `a1b2c3d`）就是**提交 ID**，回滚时要用到

### 2. 看更详细的历史（含时间、作者）

```bash
git log
```

按 `q` 退出查看。

### 3. 用图形看分支与提交

```bash
git log --oneline --graph
```

记下你要回滚到的那个提交的 **commit ID**（前 7 位一般就够用）。

---

## 二、两种常用回滚方式

### 方式 A：`git revert`（推荐，不丢历史）

- **特点**：不删除已有提交，而是**新增一个“反向”提交**，把某次（或某几次）的改动撤销掉。
- **适用**：已经推送到 GitHub、别人可能已经拉过代码的情况；想保留完整历史、方便以后查问题。

#### 只回滚「最近一次」提交

```bash
git revert HEAD --no-edit
```

- `HEAD` = 当前最新提交  
- `--no-edit` = 用默认的 revert 说明，不打开编辑器

#### 回滚「指定某一次」提交

```bash
git revert <提交ID> --no-edit
```

例如要撤销 `a1b2c3d` 这次提交：

```bash
git revert a1b2c3d --no-edit
```

#### 回滚「连续多次」提交（从新到旧）

例如要撤销最近 3 次提交：

```bash
git revert HEAD~3..HEAD --no-edit
```

或逐个回滚（从最新往旧）：

```bash
git revert HEAD --no-edit
git revert HEAD~1 --no-edit
git revert HEAD~2 --no-edit
```

#### 推送到 GitHub

```bash
git push origin main
```

（如你的分支不叫 `main`，改成实际分支名，如 `master`。）

---

### 方式 B：`git reset`（彻底回到某个提交）

- **特点**：把当前分支的 **HEAD 直接移到** 指定提交，之后的提交在本地“消失”（可恢复，但需谨慎）。
- **适用**：只在本地试错、还没推送；或确定要丢弃最近几次提交且可以强制覆盖远程时。

⚠️ **注意**：若这些提交已经推送到 GitHub，之后需要用 `git push --force`，会改写远程历史，和别人协作时要提前沟通。

#### 1）只移动分支，保留工作区改动（--soft）

```bash
git reset --soft <提交ID>
```

- 代码文件保持为“当前最新”的状态，只是最近几次提交被“取消”，改动都还在暂存区。

#### 2）移动分支，并取消暂存，但保留文件修改（--mixed，默认）

```bash
git reset <提交ID>
# 或
git reset --mixed <提交ID>
```

- 回到指定提交，且把之后的改动从暂存区撤掉，文件内容仍保留在工作区（未提交状态）。

#### 3）彻底回到该提交，丢弃之后所有改动（--hard）

```bash
git reset --hard <提交ID>
```

- 工作区和暂存区都会变成该提交的状态，**之后的修改全部丢失**，慎用。

#### 举例：回到「上一个」提交

```bash
git reset --hard HEAD~1
```

回到「上上个」提交：

```bash
git reset --hard HEAD~2
```

#### 若已经 push 过，要同步到 GitHub（会覆盖远程）

```bash
git push origin main --force
```

（再次提醒：`--force` 会改写远程历史，多人协作时务必确认。）

---

## 三、简要对比与选择

| 场景                     | 建议方式        |
|--------------------------|-----------------|
| 已推送到 GitHub，要安全撤销 | `git revert`    |
| 只在自己电脑上，想彻底回到某版本 | `git reset --hard` |
| 想保留“回滚”记录、便于排查问题 | `git revert`    |
| 确定要丢弃最近几次提交并覆盖远程 | `git reset --hard` + `git push --force` |

---

## 四、回滚错了怎么办？

### 若刚做了 `git reset --hard`，想恢复

用 `git reflog` 查到你“回滚前”的提交 ID，再 reset 回去：

```bash
git reflog
git reset --hard <当时的提交ID>
```

### 若刚做了 `git revert`，想撤销这次 revert

再对“这次 revert 的提交”做一次 revert 即可：

```bash
git revert HEAD --no-edit
```

---

## 五、本地操作速查

```bash
# 看历史（简短）
git log --oneline

# 安全回滚（已推送时用）
git revert HEAD --no-edit
git push origin main

# 彻底回滚到上一版（未推送或确定要覆盖远程时用）
git reset --hard HEAD~1
git push origin main --force   # 仅当需要同步到 GitHub 且接受覆盖时
```

---

## 六、建议

1. 回滚前用 `git status` 确认没有未提交的重要修改，必要时先 `git stash` 暂存。
2. 重要分支（如 `main`）在 GitHub 上可开启分支保护，避免误用 `--force` 覆盖。
3. 不确定时优先用 `git revert`，历史清晰、可追溯。

---

## 七、本项目（2.0 前端）回滚实战

当前提交线（从新到旧）：

| 提交 ID   | 说明 |
|-----------|------|
| 23142dd   | 2.25 进度（当前最新） |
| 4de02b2   | 666还有第二关 |
| **8c9fbe8** | **前端UI开发第一天** ← 前端大改起点，问题可能从这里开始 |
| 55ddd79   | 进行了排行榜的后端开发 |
| c5ad2cf   | 排行榜开发计划、自检报告 |
| 39cb822   | 排行榜行动指南 |
| fb33797   | 食堂系统后端完善 |
| 9cb77f8   | 开发了帖子系统 |
| fe1c809   | 初始化项目 - 认证模块已完成 |

**推荐回滚目标**（前端回到“不乱”的状态）：

- **回滚到「前端UI开发之前」**：回到 `55ddd79`（只有排行榜后端，前端还未大改）。
- 若只想撤销最近几次提交，可回滚到 `8c9fbe8` 或 `4de02b2`，再自己修。

---

### 操作前必做：处理本地未提交的修改

你当前有未提交的修改（如 `PostNew.jsx`、`ProductDetail.jsx`、`routes` 等）。回滚前二选一：

- **想保留这些修改以后再用**：先暂存  
  ```bash
  git stash push -m "2.0前端问题前的本地修改"
  ```
- **确定不要了**：直接丢弃  
  ```bash
  git restore .
  git clean -fd
  ```
  （`git clean -fd` 会删掉未跟踪文件，新增的 `frontend/src/api/canteen.js` 等也会被删，慎用。若只丢弃已跟踪文件的修改，只执行 `git restore .` 即可。）

---

### 方案 A：彻底回到「前端UI开发之前」（55ddd79）

适合：接受丢弃从「前端UI开发第一天」到现在的所有提交，让代码库回到那时。

```bash
# 1. 处理本地修改（见上，stash 或 restore）
# 2. 彻底回退到 55ddd79
git reset --hard 55ddd79

# 3. 若已推送到 GitHub，需要强制覆盖远程（会改写历史）
git push origin main --force
```

之后 `main` 就停在「排行榜后端完成、前端尚未大改」的状态。

---

### 方案 B：保留历史，用 revert 撤销「前端大改」之后的提交（较繁琐）

若希望历史里仍能看到 2.0 的提交、只是用新提交“抵消”它们，可以逐个 revert（从最新往旧）：

```bash
git revert 23142dd --no-edit
git revert 4de02b2 --no-edit
git revert 8c9fbe8 --no-edit
# 如有冲突，解决后 git add . && git revert --continue
git push origin main
```

这样会多出 3 个 revert 提交，但不会删掉原有提交记录。

---

### 建议

- 若 2.0 只有你一个人在用、且确定要“回到重来”：用 **方案 A** 最简单。
- 回滚后，下次做前端大改时建议：**开新分支**（如 `feature/frontend-2.0`），在分支上一点点做、再合并，避免再次一股脑改乱。
