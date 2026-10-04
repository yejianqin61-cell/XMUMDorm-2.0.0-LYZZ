# Git 协作手册（团队）

**适用**：所有在本仓库提交代码的人与协助者 Agent。
**日期**：2026-10-02　**版本**：v1.0　**上位规则**：[团队协作契约](团队协作契约.md)。**命令教程**（Git 是什么、三区模型、回滚原理）见 [`docs/09-Deploy/git/`](../09-Deploy/git/) —— 本文只写"**这个仓库里到底怎么操作**"。

> **一句话结论**：**你的每一次提交都先落在自己的 `dev-<缩写>` 分支，再通过 PR 合进 `main`；`main` 永远可发布。**
> 三条不会错的纪律：**开工先同步 `origin/main`** · **只 `git add` 显式路径** · **永不 `push --force`**。

## 一、一次性初始化

```bash
git clone https://github.com/yejianqin61-cell/XMUMDorm-2.0.0-LYZZ.git
cd XMUMDorm-2.0.0-LYZZ

# 先在 GitHub 上建好 dev-<你的缩写> 分支（如 dev-yjq），然后：
git switch dev-<缩写>              # 远端已有 → 自动跟踪
# 若远端还没有，用这两条：
# git switch -c dev-<缩写>
# git push -u origin dev-<缩写>

git config user.name  "你的名字"
git config user.email "你的邮箱"
```

**缩写一旦定下就别改**（PR 历史、分支保护都认这个名字）。

## 二、每天的循环（六条命令，**其中两条是硬性检查**）

```bash
# ① 开工前：先同步（这一步不能省，否则你是在旧代码上干活）
git fetch origin
git switch dev-<缩写>
git merge origin/main
git log --oneline HEAD..origin/main    # 应为空；非空说明还没同步完

# …… 改代码 ……

# ② 提交前：看清自己改了什么
git status && git diff --check

# ③ push 前：再查一次远程（见下）
git fetch origin
git log --oneline HEAD..origin/dev-<缩写>   # 别人往你的分支推过什么
git log --oneline origin/dev-<缩写>..HEAD   # 你将要推上去什么
git push

# ④ push 后：确认落地
git status                                  # 应显示与 origin 一致
```

> **⛔ 两条不可跳过的检查**
> **开工前 pull**（`fetch` + `merge origin/main`）：否则你在别人已改掉的代码上接着写，冲突会成倍放大。
> **push 前查远程**（`fetch` 后看 `HEAD..origin/dev-<缩写>`）：否则轻则 push 被拒，重则你以为推上去了、其实本地与远程已经分叉。
>
> **`git pull` = `fetch` + `merge`**（本仓库统一 merge，不用 rebase）。只看不动工作区用 `git fetch`；要落到本地就 `git merge origin/main`。

## 三、提交：一个 commit 只做一件事

**标题格式**（契约 §3）：`type(scope): 简短说明`

| type | 用途 |
|---|---|
| `feat` | 新功能 |
| `fix` | 缺陷修复 |
| `docs` | 文档、协作说明 |
| `refactor` | 不改行为的整理 |
| `test` | 测试 |
| `style` | 纯样式/格式 |
| `chore` | 构建、依赖、工具配置 |

**scope 用模块名或文档层名**（本仓库真实在用的例子）：

```text
feat(canteen): add public dish contribution entry
fix(mailbox): render announcement content
docs(team): add collaboration contract
docs(app): 落库所有者第三轮 7 项裁决
fix(app-tokens): 修正亮色状态文字的对比度口径错误
```

**暂存必须写显式路径**（⛔ 禁止 `git add .`）：

```bash
git add frontend/src/pages/Settings.jsx frontend/src/pages/Settings.css
git commit -m "fix(settings): 手机号校验提示改为可改正文案"
```

**提交前自检**：

```bash
git status          # 有没有 .env / node_modules / 别人的文件混进来
git diff --check    # 空白错误
git diff --cached   # 这次到底提交了什么
```

## 四、PR：唯一的合并入口

```text
base:    main
compare: dev-<缩写>
```

**PR 描述四要素**（契约 §4，缺一不可）：① 做了什么 ② 如何验证（命令 + 结果）③ 是否涉及迁移/环境变量/权限/生产数据 ④ UI 改动附截图或录屏。

**合并前**：分支已同步近期 `main` 且无未解决冲突 · 验证结果写在 PR 里 · **至少一位有权限的成员批准** · **作者不批自己的 PR**。

**合并后**：个人分支**长期保留**（继续从 `main` 同步），只在确定不再使用时删。

## 五、冲突怎么处理

```bash
git fetch origin
git switch dev-<缩写>
git merge origin/main          # 这一步会报冲突
git status                     # 列出冲突文件
# 手工编辑这些文件，只解决与当前任务有关的部分
git add <解决后的文件>
git commit                     # 完成这次 merge
git push
```

**三条纪律**：
1. **只解决与当前任务有关的冲突**；无关处保持 `main` 的版本。
2. **看不懂归属就停**：在 PR/Issue 里说明"这两个版本分别是谁的意图"，**不要猜着选一个**（契约 §2）。
3. **想退出重来**：`git merge --abort`，然后找人一起看。

## 六、别人动了代码怎么办（**本节是协作的核心**）

**先分清三种"别人动了"**，处理方式完全不同：

| 情形 | 你怎么发现 | 怎么做 |
|---|---|---|
| **① 别人动了 `main`**（最常见） | 开工前 `git fetch` 后 `git log --oneline HEAD..origin/main` 有输出 | **把 `origin/main` 合进自己的分支再继续**：`git merge origin/main`；冲突按 §五 处理。⛔ **不要因为"怕冲突"就继续在旧代码上写** |
| **② 别人动了你也在用的分支**（共享分支，或你在另一台机器上提交过） | `git fetch` 后 `git log --oneline HEAD..origin/dev-<缩写>` 有输出 | **先 `git pull --no-rebase`**（= fetch + merge），再 push。⛔ **绝不 `push --force`** |
| **③ 别人改了你正在改的同一个文件** | merge 时冲突；或打开文件发现自己没写过的东西 | 见下面固定五步 |

**情形 ③ 的固定五步**（顺序不要改）：

```bash
git fetch origin
git switch dev-<缩写>
git stash push -m "我未提交的改动"   # 1) 先保住自己的改动（或先提交到临时分支）
git merge origin/main               # 2) 合别人的
git stash pop                       # 3) 把自己的改动放回来
git status && git diff              # 4) 逐块看清：哪些是别人的、哪些是我的
# 5) 只保留与当前任务有关的部分，其余保持 main 的版本
```

**这五步里的三条纪律**

1. **只动与当前任务有关的部分**；别人在这个文件里的改动**原样保留**（哪怕你觉得他写得不好——那是另一个 PR 的事）。
2. **看不懂归属就停**：把 `git log -p -- <文件>` 或冲突片段贴出来，问清楚"这两边分别是谁的意图"。⛔ **不许猜着选一个。**
3. ⛔ **任何时候都不要用 `push --force` 去"解决"分叉** —— 那会把别人的提交从远程抹掉。

**查明"这个文件最近被谁动过"**

```bash
git log --oneline -10 -- <文件>                  # 这个文件最近 10 次提交
git log -p -3 -- <文件>                          # 看具体改了什么
git log --oneline origin/main..HEAD -- <文件>     # 只有我改过它吗
git blame -L 40,60 -- <文件>                     # 这 20 行分别是谁写的
```

**如果发现自己被别人覆盖了**（自己的提交不在远程了）

1. **立即通知仓库管理员**，⛔ 不要自己再 force push"抢回来"（会把对方的提交也抹掉）。
2. 用 `git reflog` 找到自己的提交：`git reflog | Select-String "<你的提交说明>"`。
3. 先落到一个安全分支上：`git branch rescue-<日期> <sha>`，再由管理员决定怎么合回去。

**同一个文件被两个 Agent 同时改**（本仓库发生过）：工具报"文件已被改动"**不是**让你覆盖写，而是让你**重新读、把自己的改动重做到新内容上**；收工前复查 `git diff`，确认只含自己的改动。

## 七、出事了怎么办（对照表）

| 事故 | 处置 | 注意 |
|---|---|---|
| 忘了切分支，直接在 `main` 上改了（**未提交**） | `git switch -c dev-<缩写>` | 改动会跟着你走，`main` 自动变干净 |
| 在 `main` 上已经提交（**未推送**） | `git branch dev-<缩写>` → `git switch dev-<缩写>` → `git switch main` → `git reset --hard origin/main` | 先确认提交已保存在 `dev-<缩写>` 上；Agent 不得执行本条，交给人 |
| 提交到了错误的分支（未推送） | `git reset --soft HEAD~1`，切到正确分支重新提交 | `--soft` 保留改动，不会丢代码 |
| 想撤销最后一次提交（**已推送**） | `git revert <sha>`，产生一个反向提交 | ⛔ **不要** `reset --hard` + `push --force` |
| `push` 被拒（non-fast-forward） | `git pull --no-rebase origin dev-<缩写>` → 解冲突 → 再 `push` | 说明远端有你本地没有的提交（常是自己换机器提交过） |
| **提交了 `.env` / 密钥** | ① `git rm --cached .env` 并补进 `.gitignore` → 提交 ② **立刻轮换该密钥** ③ 通知管理员处理历史 | 契约 §7：只删当前文件**不算解决** |
| 提交了 `node_modules/` 或大产物 | `git rm -r --cached node_modules` → 确认 `.gitignore` 已含该目录 → 提交 | 已进入历史的大文件要管理员处理 |
| PR 里混进一堆无关文件 | `git diff origin/main...dev-<缩写> --stat` 看清单，逐个判断是否需要 | 常见原因是"分支上残留了上一次任务的改动" |
| 分支落后太多、冲突面很大 | 先 `git merge origin/main` 把冲突变小，**分多次小提交**推进 | 不要攒一个巨型提交 |
| 误删了分支 | `git reflog` 找到最后提交 → `git branch <名字> <sha>` | 未推送的删除越早救越容易 |

## 八、禁令（与协助者守则一致）

⛔ 不直接 `push` 到 `main` · ⛔ 不 `push --force`（任何分支） · ⛔ 不对别人的分支 `rebase`/`merge` · ⛔ 不 `reset --hard` 或 `clean -fd` 去"清理"别人的改动 · ⛔ 不删分支/删 tag（`app-legacy-v1` 是旧 App 的唯一归档） · ⛔ 不 `git add .` · ⛔ 不提交密钥、`.env`、`uploads/`、`node_modules/`、个人 IDE 配置。

## 九、与既有文档的分工（别重复写）

| 想知道的 | 看哪份 |
|---|---|
| 团队规则（分支模型、提交规范、PR 要求、密钥） | [团队协作契约](团队协作契约.md) |
| AI Agent 的行为底线与汇报格式 | [协助者 Agent 守则](协助者Agent守则.md) |
| **本仓库的具体操作** | **本文** |
| Git 原理与命令教程 | [`docs/09-Deploy/git/`](../09-Deploy/git/)：`Git与GitHub教程.md`、`Git命令速查.md`、`Git回滚教程.md`、`Git问题修复指南.md`、`合并到主分支指南.md` |
| 环境怎么跑起来 | [本地开发环境手册](本地开发环境手册.md) |

## 十、需要仓库管理员确认的三件事

| # | 事项 | 我的建议 |
|---|---|---|
| 1 | `main` 是否开启**分支保护**（禁直推、要求 PR + 至少 1 位批准） | **必须开** —— 第六节所有事故的兜底都依赖它挡住误推 |
| 2 | PR 的**合并方式** | 【建议】`Squash and merge`：`main` 保持线性、一次 PR 一个提交，回滚简单 |
| 3 | 是否加 **PR 模板**（把契约 §4 的四要素固化成复选框） | 【建议】加，放在 `.github/pull_request_template.md` |
