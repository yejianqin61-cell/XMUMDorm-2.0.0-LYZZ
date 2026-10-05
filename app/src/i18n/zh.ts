/**
 * 中文词条（**唯一创作源**：先写 zh，再写 en）
 *
 * 纪律（宪法 6.x / 10.4 / 10.5）：
 * 1. **平坦 key → string**，不做嵌套（嵌套会让 key 类型推导与"缺词条"检查变复杂）。
 * 2. ⛔ **不写说明性旁白**（"这个功能是用来…"）；只留**标识 / 动作 / 状态**三类文字。
 * 3. ⛔ 字数：按钮与标签 ≤6 汉字、标题 ≤12 汉字；错误/合规文案例外（10.5-6）。
 * 4. ⛔ 不写占位废话（"加载中…" / "暂无数据" / "请稍候"）。
 * 5. ⛔ 屏内**不得**用内联三元按语言选串（`isZh` 加问号那种写法，尺子会拦）—— 一律走本表。
 */
export const zh = {
  // ── 一级导航（五格，宪法 4.1）────────────────────────────────
  'tab.square': '广场',
  'tab.tools': '工具',
  'tab.campus': '校园里',
  'tab.me': '我的',
  // 第 5 格：只有加号无可见标签，但**必须**有可读标签（骨架规范 §3.4）
  'tab.publish': '发布',
  'tab.publishHint': '打开发布中心',

  // ── 顶栏（宪法 4.2 / 4.7：只允许一个动作）────────────────────
  'topbar.mailbox': '信箱',
  'topbar.mailboxUnread': '信箱，{n} 条未读',

  // ── 无障碍（宪法 7.2：读屏要播报位置）────────────────────────
  'a11y.tabPosition': '第 {i} 个，共 {n} 个',
  // 组合式无障碍标签：**必须走词条**，否则英文界面会出现中文（P1-08 的实现期发现）
  'a11y.ratingTier': '{label}，权重 {weight}',
  'a11y.starRating': '{label}，{filled} 分，共 {max} 分',
  'a11y.starRatingBare': '{filled} 分',

  // ── 发布中心（宪法 4.9.5：注册表驱动，新增一类 = 加一行）──────
  'publish.title': '发布',
  'publish.entry.wall': '万能墙',
  'publish.entry.confession': '树洞',
  'publish.entry.clubActivity': '社团活动',
  'publish.entry.marketplace': '二手',
  'publish.entry.errand': '跑腿',
  'publish.entry.carpool': '拼车',
  'publish.entry.qa': '问答',
  // A-05 合规门禁（宪法 12.2）：这三条挂在**每个发布表单的提交链路**上
  'publish.gate.terms.perceive': '发布前要先接受条款',
  'publish.gate.terms.understand': '发布属于用户内容，需先接受用户政策',
  'publish.gate.terms.fix': '打开条款并接受',

  // ── 工具 Tab：三个校方系统（**只有这三个是网页**，宪法 4.1.2-1）──────
  'tools.system.ac': '教务 AC',
  'tools.system.moodle': 'Moodle',
  'tools.system.checkin': '签到',
  // 校方系统会话三态（`D27 SchoolSystemCard`；状态**必须可播报且不只靠色块**）──
  'tools.session.signedOut': '未登录',
  'tools.session.signedIn': '已登录',
  'tools.session.expired': '会话已过期',
  'tools.session.clear': '清除会话',
  // `T-04` 校方系统与会话（P1-14）
  'tools.systems.title': '校方系统',
  'tools.systems.empty': '没有可用的系统',
  'tools.open': '打开',
  // ⚠️ 如实说明：我们只能看到"本机观察到什么"，看不到校方系统的权威状态
  'tools.sessions.notice': '会话状态由本机观察得出；清除会话只删除本机记录，校方站点可能仍记得登录',
  'tools.sessions.short': '查看与清除会话状态',
  // `T-05` 工具栏（P1-14）
  'tools.readSchedule': '读取本页课表',
  'tools.schedule.scraped': '已读到 {rows} 行，去「课表导入」确认',
  'tools.schedule.none': '这一页没有读到课表，请在课表页再试一次',

  // ── 表单校验文案（`K01`/`K03` 用；**只给词条 key**，文案在这里）──────────
  'form.error.required': '这一项不能为空',
  'form.error.tooLong': '内容超过上限',
  'form.error.submit': '提交没有成功',

  // ── 登录最小链路（P1-13；`P15` 完整鉴权原型属后续任务）──────────────
  'auth.title': '登录',
  'auth.identifier': '学号或邮箱',
  'auth.password': '密码',
  'auth.login': '登录',
  'auth.failed': '登录没有成功',
  'auth.signedOut': '未登录',
  'auth.expired': '登录已过期',
  'auth.logout': '退出登录',

  // ── 食堂评级的 5 档（**非线性权重** 10/7/4/1/−1，`D11 RatingScale` 专用）──
  // ⛔ 不得被 `D10 StarRating` 代替：语义与权重都不是线性的（组件定义 §2.6）
  'canteen.rating.hot': '夯爆了',
  'canteen.rating.top': '顶级',
  'canteen.rating.above': '人上人',
  'canteen.rating.npc': 'NPC',
  'canteen.rating.dead': '拉完了',

  // ── 四个目的地占位（Phase 1 起填内容；⛔ 不写"建设中"这类旁白）──
  'screen.square': '广场',
  'screen.tools': '工具',
  'screen.campus': '校园里',
  'screen.me': '我的',
  'screen.mailbox': '信箱',

  // ── 二级 Tab（宪法 4.8；校园里两项已定，广场/工具待 C-03/C-04）──
  'secondary.confession': '树洞',
  'secondary.wall': '万能墙',

  // ── 错误文案三要素（宪法 10.4：可感知 / 可理解 / 可改正）───────
  // 网络类必须分三种 —— 用户能做的事不同
  'error.net.offline.perceive': '网络没连上',
  'error.net.offline.understand': '手机当前没有可用网络',
  'error.net.offline.fix': '打开网络后重试',
  'error.net.unreachable.perceive': '服务连不上',
  'error.net.unreachable.understand': '服务器没有响应，可能是校内网络没连上',
  'error.net.unreachable.fix': '连上校园网后重试',
  'error.net.timeout.perceive': '等待超时',
  'error.net.timeout.understand': '服务器太慢，超过 {seconds} 秒没有回应',
  'error.net.timeout.fix': '稍后重试一次',
  'error.validation.perceive': '{field}格式不对',
  'error.validation.understand': '{field}需要满足：{rule}',
  'error.validation.fix': '修改{field}后提交',
  'error.permission.perceive': '没有该操作权限',
  'error.permission.understand': '{action}需要{role}身份',
  'error.permission.fix': '切换账号后重试',
  'error.content.perceive': '内容未通过检查',
  'error.content.understand': '第 {position} 处含有不允许发布的词',
  'error.content.fix': '修改那一处后提交',
  'error.conflict.perceive': '内容已被改动',
  'error.conflict.understand': '这条内容在你编辑期间被别人更新过',
  'error.conflict.fix': '刷新后重新编辑',
  'error.unknown.perceive': '{action}没完成',
  'error.unknown.understand': '发生了一个我们没预料到的错误，已经记下',
  'error.unknown.fix': '返回上一页后重试',

  // ── 通用动作（动词开头；宪法 10.4 要求可执行）──────────────────
  'action.retry': '重试',
  'action.back': '返回',
  'action.close': '关闭',
  'action.clear': '清除',
  'action.refresh': '刷新',
  'action.openInBrowser': '浏览器打开',
} as const;

/** 词条 key 的联合类型 —— `t()` 只接受它，**缺词条是编译期错误** */
export type MessageKey = keyof typeof zh;
