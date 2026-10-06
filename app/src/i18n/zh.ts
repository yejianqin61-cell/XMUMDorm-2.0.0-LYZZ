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
  // 丙：万能墙投稿
  'publish.wall.template': '版式',
  'publish.wall.content': '正文',
  'publish.wall.bigtype': '大字卡',
  'publish.wall.letter': '信笺卡',
  'publish.wall.note': '便签卡',
  'publish.wall.invalidTemplate': '所选版式不可用，请选择大字卡、信笺卡或便签卡。',
  'publish.wall.tooLong': '正文超过当前版式上限，请缩短正文或切换版式。',

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
  'publish.submit': '发布',
  'publish.submitted': '已发布',
  // 描述符还没交的发布类型（P2A-05 的临时业务空态；账本变短即消失）
  'publish.unavailable.title': '暂未开放',
  'publish.unavailable.action': '返回',
  'publish.gate.terms.button': '去看条款',
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

  // ── `T-03` 课表导入（P1-15）──────────────────────────────────────────
  'import.title': '课表导入',
  'import.pasteLabel': '粘贴课表文本',
  'import.pasteHelp': '在「教务 AC」的课表页点「读取本页课表」，或直接粘贴文本',
  'import.preview': '预览',
  'import.commit': '确认导入',
  'import.tooShort': '内容太短，请粘贴完整课表',
  'import.summary': '{courses} 门课程 · {meetings} 段上课时间',
  'import.errorsTitle': '有 {n} 行没能解析',
  'import.overwriteTitle': '整表覆盖',
  'import.overwriteBody': '现有课表会被这次导入的内容替换，无法撤销',
  'import.overwriteConfirm': '覆盖',
  'import.done': '已导入 {courses} 门课程',

  // ── `T-02` 课表周视图（P1-16）────────────────────────────────────────
  'tools.timetable': '课程表',
  'timetable.weekLabel': '第 {n} 周',
  'timetable.prevWeek': '上一段',
  'timetable.nextWeek': '下一段',
  'timetable.stale': '显示的是上次同步的课表',
  'timetable.empty': '这一周还没有课',
  'timetable.importHint': '课表不对？可以重新导入',
  'timetable.semesterNote': '周次按学校所在地时区计算',
  'timetable.courseInfo': '{name} · {when} · {venue}',

  // ── 星期（后端的 `day_of_week`：1=周一 … 7=周日）────────────────────
  'weekday.1': '周一',
  'weekday.2': '周二',
  'weekday.3': '周三',
  'weekday.4': '周四',
  'weekday.5': '周五',
  'weekday.6': '周六',
  'weekday.7': '周日',

  // ── 表单校验文案（`K01`/`K03` 用；**只给词条 key**，文案在这里）──────────
  'form.error.required': '这一项不能为空',
  'form.error.tooLong': '内容超过上限',
  'form.error.submit': '提交没有成功',
  // 表单骨架的固定标签（P2A-04：宿主统一给，⛔ 页面不再各写一份）
  'form.summary.title': '请检查以下内容',
  'form.leave.title': '放弃这次编辑',
  'form.leave.body': '已填的内容不会保存',
  'form.leave.confirm': '放弃',
  'form.leave.cancel': '继续编辑',

  // ── 登录最小链路（P1-13；`P15` 完整鉴权原型属后续任务）──────────────
  'auth.splash': '厦马小筑',
  'auth.title': '登录',
  'auth.identifier': '学号或邮箱',
  'auth.password': '密码',
  'auth.login': '登录',
  // ── 注册与找回密码（A-03/A-04；P2C2-02 起）──────────────────────────
  'auth.register': '注册',
  'auth.toRegister': '注册新账号',
  'auth.email': '校内邮箱',
  'auth.emailDomain': '需要 @xmu.edu.my 邮箱',
  'auth.sendCode': '发验证码',
  'auth.sendFailed': '验证码没发出去',
  'auth.resendIn': '{n} 秒后重发',
  'auth.devCode': '开发期验证码 {code}',
  'auth.code': '验证码',
  'auth.codeLength': '验证码是 6 位',
  'auth.username': '用户名',
  'auth.passwordShort': '密码至少 6 位',
  'auth.toReset': '找回密码',
  'auth.newPassword': '新密码',
  'auth.resetSubmit': '重置密码',
  'auth.resetDone': '密码已重置',
  'auth.codeNotSent': '先获取验证码',
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
  // ── 食堂切片 `S-07`…`S-10`（P1-17）──────────────────────────────────
  'square.services': '服务入口',
  'canteen.title': '食堂',
  'canteen.regions': '按区域逛',
  'canteen.noRegions': '暂时没有开放的区域',
  'canteen.pick': '今天吃什么',
  'canteen.pickEmpty': '还没有可以推荐的菜',
  'canteen.pickFailed': '这次没抽到，稍后再试',
  'canteen.shopsTitle': '区域店铺',
  'canteen.noShops': '这个区域还没有店铺',
  'canteen.regionTop': '本区热销',
  'canteen.menuTitle': '店铺菜品',
  'canteen.allCategories': '全部',
  'canteen.shopHot': '本店热门',
  'canteen.dishes': '菜单',
  'canteen.noDishes': '这家店还没有上架菜品',
  'canteen.dishTitle': '菜品详情',
  'canteen.dishMissing': '这道菜不在了',
  'canteen.price': '价格',
  'canteen.priceValue': 'RM {price}',
  'canteen.valueNone': '暂无',
  'canteen.scoreLabel': '综合分',
  'canteen.score': '{score} 分',
  'canteen.scoreNone': '暂无评分',
  'canteen.reviews': '点评',
  'canteen.reviewCount': '{n} 条',
  'canteen.comments': '点评',
  'canteen.noComments': '还没有人点评，来当第一个',
  'canteen.anonymous': '匿名',
  'canteen.merchant': '商家回复',
  'canteen.loadMore': '加载更多',

  // ── 四个目的地占位（Phase 1 起填内容；⛔ 不写"建设中"这类旁白）──
  'screen.square': '广场',
  'screen.tools': '工具',
  'screen.campus': '校园里',
  'screen.me': '我的',
  // ── 我的 / 仪表盘（M-01；P2C-03 起）────────────────────────────────
  'me.level.1': '新生',
  'me.level.2': '探索者',
  'me.level.3': '贡献者',
  'me.level.4': '校园达人',
  'me.level.5': '资深成员',
  'me.level.6': '校园传奇',
  'me.valueUnknown': '暂无',
  'me.stat.unread': '未读',
  'me.stat.todos': '今日待办',
  'me.stat.courses': '今日课程',
  'me.courses.line': '{time} {name}',
  'me.courses.none': '今天没有课',
  'me.courses.more': '还有 {n} 节',
  'me.todos.none': '今天没有待办',
  'me.section.failed': '这一块没加载出来',
  'me.entries.title': '更多',
  'me.entry.posts': '我的帖子',
  'me.entry.settings': '设置',
  'me.entry.about': '关于与法律',
  // ── 我的帖子（M-04；P2C-04 起）──────────────────────────────────────
  'me.posts.noText': '没有正文',
  'me.posts.meta': '{likes} 赞 · {comments} 评论',
  'me.posts.delete': '删除',
  'me.posts.delete.title': '删除这条帖子',
  'me.posts.delete.body': '删除后无法恢复',
  'me.posts.delete.confirm': '删除',
  'me.posts.empty.title': '还没有帖子',
  'me.posts.empty.description': '发布后就会出现在这里',
  'me.posts.empty.action': '去发布',
  // ── 设置与法务（M-13/M-18/M-19/M-20；P2C-05 起）────────────────────
  'me.settings.title': '设置',
  'me.settings.language': '语言',
  'me.settings.language.zh': '中文',
  'me.settings.language.en': 'English',
  'me.settings.more': '更多',
  'me.legal.docs': '法律文本',
  'me.legal.privacy': '隐私政策',
  'me.legal.terms': '服务条款',
  'me.legal.stale': '显示的是内置版本',
  'me.legal.empty': '这一页没有内容',
  // ── 资料编辑（M-02；P2C-06 起）──────────────────────────────────────
  'me.edit.title': '编辑资料',
  'me.edit.section': '基本资料',
  'me.edit.entry': '编辑资料',
  'me.edit.nickname': '昵称',
  'me.edit.college': '学院',
  'me.edit.grade': '年级',
  'me.edit.major': '专业',
  'me.edit.showCollege': '公开学院',
  'me.edit.showGrade': '公开年级',
  'me.edit.showMajor': '公开专业',
  'me.edit.avatar': '头像',
  'me.edit.avatarUnavailable': '选图暂不可用',
  'screen.mailbox': '信箱',
  // ── 私信（M-11 / M-12；P2B-03 起）────────────────────────────────────
  'mailbox.conversations.title': '私信',
  'mailbox.conversations.untitled': '商品已下架',
  'mailbox.conversations.noMessage': '还没有消息',
  'mailbox.conversations.peerFallback': '对方',
  'mailbox.conversations.roleSeller': '我是卖家',
  'mailbox.conversations.roleBuyer': '我是买家',
  'mailbox.conversations.end': '没有更多了',
  'mailbox.conversations.empty.title': '还没有私信',
  'mailbox.conversations.empty.description': '在二手详情里联系卖家',
  'mailbox.conversations.empty.action': '去看二手',
  // ── 信箱（F-01；P2B-04 起）──────────────────────────────────────────
  'mailbox.category.interaction': '互动',
  'mailbox.category.transaction': '交易',
  'mailbox.category.system': '系统',
  'mailbox.kind.like': '收到了赞',
  'mailbox.kind.comment': '收到了评论',
  'mailbox.kind.chat': '收到私信',
  'mailbox.kind.announcement': '公告',
  'mailbox.kind.other': '通知',
  'mailbox.unread': '未读',
  'mailbox.markAllRead': '全部已读',
  'mailbox.empty.title': '这里还没有消息',
  'mailbox.empty.description': '新的互动与交易会出现在这里',
  'mailbox.clear.action': '清空',
  'mailbox.clear.title': '清空这一类',
  'mailbox.clear.body': '公告不会被清空',
  'mailbox.clear.confirm': '清空',
  // ── 私信会话（M-12；P2B-06 起）──────────────────────────────────────
  'mailbox.chat.placeholder': '写点什么',
  'mailbox.chat.send': '发送',
  'mailbox.chat.empty.description': '先打个招呼',
  'mailbox.chat.read': '已读',

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
  'action.cancel': '取消',
  'action.clear': '清除',
  'action.refresh': '刷新',
  'action.openInBrowser': '浏览器打开',
  'action.save': '保存',
} as const;

/** 词条 key 的联合类型 —— `t()` 只接受它，**缺词条是编译期错误** */
export type MessageKey = keyof typeof zh;
