export function getSiteShellMeta(pathname, { isZh, isAdmin }) {
  const fallback = {
    eyebrow: 'Main Viewport',
    title: isZh ? '主内容视口' : 'Main viewport',
    description: isZh
      ? '这里承接 Step 3 页面模板与业务页内容，保持桌面端阅读节奏和容器边界稳定。'
      : 'This viewport hosts Step 3 templates and business pages with a stable desktop reading rhythm.',
    chips: [
      isZh ? 'Step 3 模板承载区' : 'Template viewport',
      isZh ? '桌面阅读宽度' : 'Desktop width',
    ],
    asideSections: [
      {
        title: isZh ? '接入提示' : 'Integration note',
        description: isZh
          ? '列表页、详情页、表单页和工作台页后续都挂进这里，不需要再重复设计外层容器。'
          : 'List, detail, form, and dashboard pages can attach here without rebuilding the outer shell.',
      },
    ],
    quickLinks: [
      { to: '/posts/search', label: isZh ? '搜索内容' : 'Search' },
      { to: '/publish', label: isZh ? '发布中心' : 'Publish' },
    ],
  };

  if (pathname === '/' || pathname.startsWith('/post') || pathname.startsWith('/posts')) {
    return {
      eyebrow: 'TreeHole Feed',
      title: isZh ? '树洞内容主区' : 'TreeHole viewport',
      description: isZh
        ? '以内容流阅读为主，适合承接帖子流、帖子详情、发帖入口和互动延展内容。'
        : 'Built for reading-first flows such as feeds, post detail, publishing, and interaction paths.',
      chips: [isZh ? '内容流优先' : 'Feed first', isZh ? '互动入口' : 'Interaction'],
      asideSections: [
        {
          title: isZh ? '本区定位' : 'Area focus',
          description: isZh
            ? '右侧栏优先放轻提醒、发帖说明和快速跳转，不承载必须操作。'
            : 'The aside favors lightweight prompts, posting hints, and quick jumps over required actions.',
        },
        {
          title: isZh ? '后续适配' : 'Next fit',
          description: isZh
            ? '后续树洞列表和帖子详情迁移时，可以直接消费这个阅读容器。'
            : 'Future TreeHole list and detail migrations can directly consume this reading container.',
        },
      ],
      quickLinks: [
        { to: '/post/new', label: isZh ? '发布帖子' : 'New post' },
        { to: '/posts/search', label: isZh ? '搜索帖子' : 'Search posts' },
      ],
    };
  }

  if (pathname.startsWith('/eat')) {
    return {
      eyebrow: 'Canteen Discovery',
      title: isZh ? '食堂浏览主区' : 'Canteen viewport',
      description: isZh
        ? '适合承接食堂分区、商家列表、菜品详情和榜单内容，保持信息浏览路径清晰。'
        : 'Suitable for canteen areas, merchant lists, food detail pages, and rankings with a clear browsing path.',
      chips: [isZh ? '信息浏览' : 'Discovery', isZh ? '列表与详情' : 'Lists and detail'],
      asideSections: [
        {
          title: isZh ? '使用建议' : 'Usage note',
          description: isZh
            ? '辅助栏可以放排行榜入口、搜索捷径和商家运营说明，避免与主列表抢焦点。'
            : 'Use the aside for rankings, search shortcuts, and merchant notes without competing with the main list.',
        },
      ],
      quickLinks: [
        { to: '/eat/search', label: isZh ? '搜索餐厅' : 'Search canteen' },
        { to: '/eat/rankings', label: isZh ? '排行榜' : 'Rankings' },
      ],
    };
  }

  if (pathname.startsWith('/myzone')) {
    return {
      eyebrow: 'Personal Workspace',
      title: isZh ? '个人工作台主区' : 'Workspace viewport',
      description: isZh
        ? '适合承接个人资料、课程表、待办与个人内容页，保持操作区和阅读区节奏稳定。'
        : 'Designed for profile, schedule, todo, and personal content views with a stable workspace rhythm.',
      chips: [isZh ? '工作台节奏' : 'Workspace', isZh ? '个人工具' : 'Personal tools'],
      asideSections: [
        {
          title: isZh ? '迁移收益' : 'Migration gain',
          description: isZh
            ? '工作台页面迁移后可以复用这套桌面容器，不必再重复拼壳。'
            : 'Workspace pages can reuse this desktop frame later without rebuilding the shell.',
        },
      ],
      quickLinks: [
        { to: '/myzone/profile', label: isZh ? '个人资料' : 'Profile' },
        { to: '/myzone/schedule', label: isZh ? '课程表' : 'Schedule' },
        { to: '/myzone/todos', label: isZh ? '待办' : 'Todos' },
      ],
    };
  }

  if (pathname.startsWith('/about/club')) {
    return {
      eyebrow: 'Club Community',
      title: isZh ? '社团内容主区' : 'Club viewport',
      description: isZh
        ? '这里承接社团列表、社团详情、活动与帖子内容，保持内容浏览和组织入口的分层。'
        : 'This hosts club lists, profiles, activities, and posts with a clear hierarchy for discovery and org actions.',
      chips: [isZh ? '社团模块' : 'Clubs', isZh ? '内容与组织' : 'Content and orgs'],
      asideSections: [
        {
          title: isZh ? '辅助栏建议' : 'Aside suggestion',
          description: isZh
            ? '优先放组织说明、加入入口和近期活动概览，避免把重操作塞进侧栏。'
            : 'Prefer org notes, join entry points, and upcoming activity over heavy actions in the aside.',
        },
      ],
      quickLinks: [
        { to: '/about/club/list', label: isZh ? '社团列表' : 'Club list' },
        { to: '/about/club/my', label: isZh ? '我的社团' : 'My clubs' },
      ],
    };
  }

  if (pathname.startsWith('/about/second-hand')) {
    return {
      eyebrow: 'Marketplace',
      title: isZh ? '二手交易主区' : 'Marketplace viewport',
      description: isZh
        ? '适合承接商品列表、聊天、详情页和发布页，外层容器保持信息流和交易路径平衡。'
        : 'Suited for item lists, chat, detail, and publishing with a frame balancing discovery and transaction flow.',
      chips: [isZh ? '交易流' : 'Trade flow', isZh ? '列表与沟通' : 'Lists and chat'],
      asideSections: [
        {
          title: isZh ? '接入提醒' : 'Integration note',
          description: isZh
            ? '后续迁移时建议把价格、成色、联系人等重信息留在主区，侧栏只放轻辅助。'
            : 'Keep price, condition, and contact-heavy content in the main area; reserve the aside for lightweight help.',
        },
      ],
      quickLinks: [
        { to: '/about/second-hand', label: isZh ? '二手首页' : 'Marketplace home' },
        { to: '/about/second-hand/new', label: isZh ? '发布闲置' : 'Sell item' },
      ],
    };
  }

  if (pathname.startsWith('/about/freshman-guide')) {
    return {
      eyebrow: 'Freshman Guide',
      title: isZh ? '新生指南主区' : 'Guide viewport',
      description: isZh
        ? '适合承接内容型文章、指南列表和课程点评，突出阅读密度与信息组织。'
        : 'Designed for guide articles, handbook lists, and course reviews with strong readability and information structure.',
      chips: [isZh ? '阅读型页面' : 'Reading pages', isZh ? '内容组织' : 'Content structure'],
      asideSections: [
        {
          title: isZh ? '推荐放置' : 'Suggested aside use',
          description: isZh
            ? '目录、阅读提示和相关推荐可放侧栏，正文与表单主体仍然留在主区。'
            : 'Table of contents, reading hints, and related links fit the aside while main articles stay in the viewport.',
        },
      ],
      quickLinks: [
        { to: '/about/freshman-guide', label: isZh ? '指南首页' : 'Guide home' },
        { to: '/about/freshman-guide/course-review', label: isZh ? '课程点评' : 'Course reviews' },
      ],
    };
  }

  if (pathname.startsWith('/about/errands')) {
    return {
      eyebrow: 'Errands',
      title: isZh ? '跑腿信息主区' : 'Errands viewport',
      description: isZh
        ? '适合承接任务列表、详情和发布路径，保持任务信息优先和辅助说明分离。'
        : 'Best for errand lists, detail, and publishing flows while keeping task information primary.',
      chips: [isZh ? '任务信息' : 'Task info', isZh ? '发布与浏览' : 'Publish and browse'],
      asideSections: [
        {
          title: isZh ? '侧栏职责' : 'Aside role',
          description: isZh
            ? '侧栏可承担发布提醒、接单规则和模块导航，但不要放核心交易动作。'
            : 'Use the aside for publishing tips, rules, and module jumps rather than core transaction actions.',
        },
      ],
      quickLinks: [
        { to: '/about/errands', label: isZh ? '跑腿首页' : 'Errands home' },
        { to: '/about/errands/new', label: isZh ? '发布需求' : 'Post errand' },
      ],
    };
  }

  if (pathname.startsWith('/about')) {
    return {
      eyebrow: 'Campus Square',
      title: isZh ? '广场内容主区' : 'Square viewport',
      description: isZh
        ? '适合承接校园资讯、热榜、说明页和模块分发页，保持内容浏览与模块分发并存。'
        : 'Fits campus updates, trending lists, explainers, and distribution pages while balancing reading and discovery.',
      chips: [isZh ? '模块分发' : 'Discovery', isZh ? '校园资讯' : 'Campus updates'],
      asideSections: [
        {
          title: isZh ? '使用方式' : 'How to use',
          description: isZh
            ? '右侧栏优先放模块说明、相关推荐和快捷入口，主区承接真正的页面内容。'
            : 'Let the aside carry module guidance, related links, and shortcuts while the main area holds the page itself.',
        },
      ],
      quickLinks: [
        { to: '/about/campus', label: isZh ? '校园动态' : 'Campus updates' },
        { to: '/about/trending', label: isZh ? '热搜榜' : 'Trending' },
      ],
    };
  }

  if (isAdmin) {
    fallback.quickLinks.push({ to: '/myzone/admin', label: isZh ? '管理后台' : 'Admin' });
  }

  return fallback;
}
