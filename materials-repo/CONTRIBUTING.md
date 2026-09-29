# 目录规范、命名规范与安全约定

本仓库是 **XMUM 学习资料库**，由校内同学共建。所有写入都通过站点上传流程完成，
普通用户不需要 GitHub 账号。

> 本仓库与站点之间**不互相标注**：这里不提站点地址，站点页面也不暴露本仓库地址。

---

## 一、目录结构

```
<repo-root>/
├── index.json                  ← 索引（前端唯一入口），由后端在上传 PR 内写入
├── README.md
├── CONTRIBUTING.md             ← 本文件
├── LICENSE                     ← 授权声明
├── .nojekyll                   ← 禁用 Jekyll
└── c<courseId>/                ← 第一层：课程 id（稳定、永不重命名）
    ├── README.md               ← 可选：该课程的简介
    └── <type>/                 ← 第二层：五类之一
        └── <文件>
```

**`<type>` 只能取五值**（第一层「文件类型」）：

| slug | 含义 |
|------|------|
| `notes` | 笔记 |
| `lecture` | 课件 / 讲义 |
| `exam` | 试题 |
| `answer` | 答案 |
| `other` | 其他（实验报告、作业、参考书、选课攻略…） |

> 「回忆版」**不是**一种类型，而是 `exam` 上的一个属性：`source = official | recalled`。

**课程 id（`c<id>`）为什么不是课程编码？** 课程身份 = **课程名 + 讲师**，且可由管理员合并/改名。
只有**自增、永不复用**的 id 才能保证目录路径永不重命名。课程名与 id 的映射在 `index.json`
的 `courses[]` 里，也可通过站点 API 查询。

---

## 二、文件命名规范（CI 强制）

- **允许**：中日韩文字、字母、数字、`-` `_` `.` 空格
- **禁止**：`#` `?` `%` `&` `=` `+` `:` `;` `,` `@` `$` `!` `*` `'` `"` `( )` `[ ]` `{ }` `|` `\` `<` `>` `^` `~` `` ` ``
  （这些字符会破坏 CDN URL）
- **禁止**：以 `.` 开头的隐藏文件
- **禁止**：首尾空格、路径中出现 `..`
- **建议**：`<学期>-<类型>-<描述>.<ext>`，例如 `2025-09-lecture-notes.pdf`

---

## 三、体积限制

| 限制 | 值 |
|------|-----|
| 单文件 | **≤ 20MB** |
| 仓库材料总量 | **≤ 1GB**（GitHub 官方建议 < 1GB） |

超限会被 CI 拒绝。更大的文件应走 R2 通道（见站点设计文档 FR-15）。

---

## 四、允许的文件类型

```
.md .markdown .pdf .txt .docx .pptx .xlsx .zip .png .jpg .jpeg .webp
```

**永久黑名单**（无论何时都禁止，纵深防御）：

```
.html .htm .shtml .xhtml .xht .svg .svgz .js .mjs .cjs .xml .xsl .xslt .xsd .rss .atom
.hta .htc .jsp .asp .aspx .php .phtml .cgi
.exe .dll .bat .cmd .com .scr .msi .ps1 .psm1 .sh .bash .zsh .py .rb .pl .jar .apk .app .dmg .vbs
```

> 原因：这些文件可能在浏览器中**执行脚本**。本仓库是公开的，一旦被直链打开就等同于
> 在 `*.github.io` 源上运行第三方代码，且我们**无法**通过自定义响应头（CSP / nosniff）缓解。

---

## 五、安全

### ⚠️ 自动合并与 CI 的关系

本仓库开启了 **Allow auto-merge**，且分支保护的 **required approvals = 0**（因为机器人无法
批准自己的 PR）。这意味着：

> **任何能开 PR 的人，只要修改 `.github/**`，就能让 CI 执行任意代码。**

因此：

1. `validate` workflow 只有 **`contents: read`** 权限，不做任何推送；
2. 校验器把 **`.github/**` 的任何改动判为失败**（绊线）——required check 不通过，
   自动合并不会发生；
3. 管理员应**额外**配置 **CODEOWNERS** 并开启 **Require review from Code Owners**，
   把 `.github/**` 与 `index.json` 纳入必须人工审查的路径。

**CODEOWNERS 建议内容**（放在 `.github/CODEOWNERS`）：

```
# CI 配置与索引必须人工审查，禁止机器自动合并
# ⚠️ 把下面的占位符替换成你自己的 GitHub 账号（不要写进任何公开文档）
/.github/            @<your-account>
/index.json          @<your-account>
```

### 其他

- 举报与下架：见仓库根 README 的联系方式
- 请勿上传含个人隐私信息（学号、电话、住址）的资料
- 请勿上传盗版教材或有版权争议的出版物

---

## 六、管理员手工加文件后怎么重建索引

CI **不会**在 push 后自动生成 `index.json`（原因见 `validate.yml` 顶部注释）。手工加文件后：

```bash
# 1. 拉取最新 main
git checkout main && git pull

# 2. 放好文件（遵守上面的目录与命名规范）

# 3. 重建索引
node .github/scripts/build-index.mjs

# 4. 提交并开 PR
git checkout -b chore/rebuild-index
git add -A
git commit -m "chore(index): 手工加资料并重建索引"
git push origin chore/rebuild-index
# 然后在 GitHub 上开 PR，等 validate 通过后合并
```

只想检查索引是否最新（不写入）：

```bash
node .github/scripts/build-index.mjs --check
```

---

## 七、常见校验失败与处理

| 报错 | 原因 | 处理 |
|------|------|------|
| `材料文件缺少 index.json 条目` | 加了文件没重建索引 | 跑 `build-index.mjs` 后提交 |
| `元数据过期（size 不一致）` | 文件内容改了但索引没更新 | 同上 |
| `幽灵条目` | 索引里有条目但文件没了 | 同上（会自动删除） |
| `含禁用字符` | 文件名里有 URL 特殊字符 | 重命名文件 |
| `属于永久黑名单` | 上传了 HTML/SVG/可执行文件 | 不允许，请换格式 |
| `本 PR 修改了 CI 配置` | 改了 `.github/**` | 需要管理员人工合并（见第五节） |
