/**
 * 马来语学习模块（frontend/src/features/malay）验收测试
 *
 * 这个模块是从独立项目 melayu-duolingo 移植进校园平台的。上游有一套 41 条的
 * 回归基线（tools/regression.html），这里按同样的精神把关键不变量钉住：
 *
 *   - 安全类：进度存档不能夹带同步密钥；损坏数据必须先备份再回退；
 *     页面里不允许出现 innerHTML / dangerouslySetInnerHTML 之类的注入面。
 *   - 功能类：课程数与题型序列、线性解锁、练习引擎的确定性与 4:2:1 权重、
 *     Leitner 间隔复习语义、中英数据一致性、音频资源与映射一一对应。
 *
 * 关于云同步：上游 41 条里有 12 条依赖自带的云同步（PBKDF2 + AES-GCM）。
 * 本次接入校园平台**不移植云同步**（同步码 / 后端地址 / 共享密钥一律不进进度存档），
 * 因此这些断言改写为「本地等价物」：导出备份不含 sync 段、migrate 会抹掉历史存档里的
 * 同步密钥、设置页只保留本地导出 / 导入。
 *
 * 实现说明：frontend/ 是独立 package，根目录 .babelrc 不对它生效，所以这里的
 * jest（babel-jest + node 环境）无法直接 require frontend/src 下的 ESM 模块。
 * 行为类断言改为在 node 子进程里以原生 ESM 载入这些模块再取回结果；
 * 组件部分沿用本目录既有惯例做源码文本断言。两条路径都验的是真实实现。
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (...segments) => fs.readFileSync(path.resolve(ROOT, ...segments), 'utf8');
const readMalay = (...segments) => read('frontend', 'src', 'features', 'malay', ...segments);

const MALAY_PAGE = readMalay('MalayPage.jsx');
const AUDIO_JS = readMalay('audio.js');
const LAYOUT_ROUTES = read('frontend', 'src', 'routes', 'layoutRoutes.jsx');
const SITE_SHELL_NAV = read('frontend', 'src', 'components', 'shell', 'siteShellNav.js');
const SETTINGS_VIEW = readMalay('ui', 'SettingsView.jsx');

const AUDIO_DIR = path.resolve(ROOT, 'frontend', 'public', 'malay', 'audio');

/**
 * 在 node 子进程里以原生 ESM 载入前端引擎模块，把结果以 JSON 返回。
 * body 里可以用 ROOT、importModule() 两个现成变量。
 */
function runEngine(body) {
  const script = `
    const ROOT = ${JSON.stringify(ROOT.replace(/\\/g, '/'))};
    const { pathToFileURL } = await import('node:url');
    const importModule = (rel) => import(pathToFileURL(ROOT + '/' + rel).href);
    const out = await (async () => { ${body} })();
    process.stdout.write(JSON.stringify(out === undefined ? null : out));
  `;
  const stdout = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024
  });
  return JSON.parse(stdout);
}

const ENGINE_PATHS = {
  progress: 'frontend/src/features/malay/engine/progress.js',
  questions: 'frontend/src/features/malay/engine/questions.js',
  practice: 'frontend/src/features/malay/engine/practice.js',
  merge: 'frontend/src/features/malay/engine/merge.js',
  achievements: 'frontend/src/features/malay/engine/achievements.js',
  course: 'frontend/src/features/malay/data/course.js',
  courseEn: 'frontend/src/features/malay/data/courseEn.js',
  audioMap: 'frontend/src/features/malay/data/audioMap.js',
  strings: 'frontend/src/i18n/malayStrings.js'
};

describe('马来语模块 · 课程数据与资源', () => {
  const data = runEngine(`
    const course = await importModule(${JSON.stringify(ENGINE_PATHS.course)});
    const courseEn = await importModule(${JSON.stringify(ENGINE_PATHS.courseEn)});
    const audioMap = await importModule(${JSON.stringify(ENGINE_PATHS.audioMap)});
    const merge = await importModule(${JSON.stringify(ENGINE_PATHS.merge)});
    const questions = await importModule(${JSON.stringify(ENGINE_PATHS.questions)});
    const units = course.UNITS;
    let vocab = 0; let sentences = 0; let gq = 0;
    units.forEach((u) => {
      vocab += u.vocab.filter((v) => v.ms && v.zh).length;
      sentences += u.sentences.length;
      gq += (u.gq || []).length;
    });
    const mapped = Object.values(audioMap.AUDIO_MAP);
    return {
      units: units.length,
      lessons: questions.allLessons().length,
      vocab, sentences, gq,
      audioCount: mapped.length,
      audioUnique: new Set(mapped).size,
      audioValues: mapped.slice().sort(),
      enUnitIds: Object.keys(courseEn.UNIT_EN).sort(),
      unitIds: units.map((u) => u.id).sort(),
      parity: merge.checkKeyParity()
    };
  `);

  it('14 个单元、28 节课，词条 / 例句 / 语法题数量与教材一致', () => {
    expect(data.units).toBe(14);
    expect(data.lessons).toBe(28);
    expect(data.vocab).toBe(349);
    expect(data.sentences).toBe(70);
    expect(data.gq).toBe(42);
  });

  it('中英两侧的单元 / 词条 / 例句 / 语法题完全对得上', () => {
    expect(data.parity).toEqual([]);
    expect(data.enUnitIds).toEqual(data.unitIds);
  });

  it('408 条音频映射与磁盘文件一一对应，没有缺失也没有孤儿', () => {
    expect(data.audioCount).toBe(408);
    expect(data.audioUnique).toBe(408);
    const onDisk = fs.readdirSync(AUDIO_DIR).filter((f) => f.endsWith('.mp3'));
    expect(onDisk.length).toBe(408);
    expect(onDisk.sort()).toEqual(data.audioValues);
  });
});

describe('马来语模块 · 课程结构与解锁', () => {
  const structure = runEngine(`
    const questions = await importModule(${JSON.stringify(ENGINE_PATHS.questions)});
    const all = questions.allLessons();
    const warmup = questions.lessonById('u1-0');
    const battle = questions.lessonById('u1-1');
    return {
      allIds: all.map((l) => l.id),
      warmupTypes: warmup.steps.map((s) => s.type),
      battleTypes: battle.steps.map((s) => s.type),
      battleKinds: battle.steps.filter((s) => s.type === 'mcq').map((s) => s.kind),
      unlockedFirst: questions.isUnlocked(all[0].id, {}),
      unlockedSecondEmpty: questions.isUnlocked(all[1].id, {}),
      unlockedSecondDone: questions.isUnlocked(all[1].id, { [all[0].id]: { xp: 10 } }),
      unlockedFar: questions.isUnlocked(all[5].id, { [all[0].id]: { xp: 10 } }),
      currentEmpty: questions.currentLesson({}).id,
      currentOne: questions.currentLesson({ [all[0].id]: { xp: 10 } }).id,
      nextAfterFirst: questions.nextLessonAfter(all[0].id).id,
      nextAfterLast: questions.nextLessonAfter(all[all.length - 1].id),
      warmupCount: all.filter((l) => l.id.endsWith('-0')).length,
      battleCount: all.filter((l) => l.id.endsWith('-1')).length
    };
  `);

  it('每个单元两节课：热身（-0）与实战（-1）', () => {
    expect(structure.warmupCount).toBe(14);
    expect(structure.battleCount).toBe(14);
  });

  it('热身课的步骤类型序列固定：intro → grammar → mcq → match → arrange', () => {
    const types = structure.warmupTypes;
    expect(types[0]).toBe('intro');
    expect(types[1]).toBe('grammar');
    expect(types[types.length - 3]).toBe('match');
    expect(types[types.length - 2]).toBe('arrange');
    expect(types[types.length - 1]).toBe('arrange');
    expect(types.filter((t) => t === 'mcq').length).toBeGreaterThan(0);
    expect(types.filter((t) => t === 'arrange').length).toBe(2);
  });

  it('实战课的步骤类型序列固定：intro → mcq → gq → listen → arrange → speak', () => {
    const types = structure.battleTypes;
    expect(types[0]).toBe('intro');
    expect(types[types.length - 1]).toBe('speak');
    expect(types.filter((t) => t === 'listen').length).toBe(3);
    expect(types.filter((t) => t === 'arrange').length).toBe(2);
    expect(structure.battleKinds).toContain('gq');
    expect(structure.battleKinds).toContain('vocab');
  });

  it('线性解锁：第一课永远可学，上一课没完成下一课锁住', () => {
    expect(structure.unlockedFirst).toBe(true);
    expect(structure.unlockedSecondEmpty).toBe(false);
    expect(structure.unlockedSecondDone).toBe(true);
    expect(structure.unlockedFar).toBe(false);
  });

  it('当前课 = 第一节没完成的课；下一课紧随其后', () => {
    expect(structure.currentEmpty).toBe(structure.allIds[0]);
    expect(structure.currentOne).toBe(structure.allIds[1]);
    expect(structure.nextAfterFirst).toBe(structure.allIds[1]);
    expect(structure.nextAfterLast).toBeNull();
  });
});

describe('马来语模块 · 个性化练习引擎', () => {
  const practiceResult = runEngine(`
    const practice = await importModule(${JSON.stringify(ENGINE_PATHS.practice)});
    const progress = await importModule(${JSON.stringify(ENGINE_PATHS.progress)});
    const empty = { items: {}, confuse: {} };
    const modes = {};
    ['wrong', 'confuse', 'review', 'mix'].forEach((mode) => {
      const lesson = practice.buildLesson(mode, empty, { count: 12 }, 4242);
      modes[mode] = { count: lesson.steps.length, typed: lesson.steps.every((s) => s && s.type) };
    });
    const a = practice.buildLesson('mix', empty, { count: 12 }, 20260911);
    const b = practice.buildLesson('mix', empty, { count: 12 }, 20260911);
    const c = practice.buildLesson('mix', empty, { count: 12 }, 20260912);

    const now = 1700000000000;

    // 4:2:1 轮转：用**真实词条**构造三组互不重叠的记录
    //   错题 8 条（错过、但未到期 → 只进错题本）
    //   易混 2 组（a 侧进易混淆）
    //   到期 4 条例句（seen>0 且到期 → 只进复习队列）
    const course = await importModule(${JSON.stringify(ENGINE_PATHS.course)});
    const units = course.UNITS;
    const vocabOf = (i) => units[i].vocab.find((v) => v.ms && v.zh).ms;
    const sentOf = (i) => units[i].sentences[0].ms;
    const wrongSet = [];
    const confuseSet = [];
    const reviewSet = [];
    const stats = { items: {}, confuse: {} };
    for (let i = 0; i < 8; i += 1) {
      const ms = vocabOf(i);
      wrongSet.push(ms);
      stats.items[ms] = { seen: 4, wrong: 2, right: 2, lastAt: 1, box: 0, dueAt: now + 999 * 86400000 };
    }
    for (let i = 8; i < 10; i += 1) {
      const ms = vocabOf(i);
      confuseSet.push(ms);
      stats.items[ms] = { seen: 1, wrong: 0, right: 1, lastAt: 1, box: 0, dueAt: now + 999 * 86400000 };
      stats.confuse[ms + '|' + vocabOf(i + 1)] = { n: 3, lastAt: 1 };
    }
    for (let i = 2; i < 6; i += 1) {
      const ms = sentOf(i);
      reviewSet.push(ms);
      stats.items[ms] = { seen: 2, wrong: 0, right: 2, lastAt: 1, box: 1, dueAt: now - 1000 };
    }
    const mixed = practice.buildLesson('mix', stats, { count: 12 }, 777);
    // 例句走 listen / arrange，词条走 mcq，所以要按题型分别取被考的词
    const targets = [];
    mixed.steps.forEach((s) => {
      if (s.type === 'mcq' && s.ms) targets.push(s.ms);
      if ((s.type === 'listen' || s.type === 'arrange') && s.sMs) targets.push(s.sMs);
      if (s.type === 'match' && s.msList) s.msList.forEach((m) => targets.push(m));
    });
    const count = (set) => targets.filter((ms) => set.indexOf(ms) >= 0).length;
    const wrongCount = count(wrongSet);
    const confuseCount = count(confuseSet);
    const reviewCount = count(reviewSet);

    // Leitner 语义
    const le = { items: {}, confuse: {} };
    progress.recordAnswer(le, 'apa', true, null, 'vocab', now);
    const afterOne = { box: le.items.apa.box, dueAt: le.items.apa.dueAt, wrong: le.items.apa.wrong };
    progress.recordAnswer(le, 'apa', true, null, 'vocab', now);
    const afterTwo = { box: le.items.apa.box, dueAt: le.items.apa.dueAt };
    progress.recordAnswer(le, 'apa', false, 'hati', 'vocab', now);
    const afterWrong = { box: le.items.apa.box, dueAt: le.items.apa.dueAt, wrong: le.items.apa.wrong, confuse: Object.keys(le.confuse) };
    for (let i = 0; i < 8; i += 1) progress.recordAnswer(le, 'kek', true, null, 'vocab', now);
    const capped = { box: le.items.kek.box, dueAt: le.items.kek.dueAt };

    const wrongStats = { items: {}, confuse: {} };
    progress.recordAnswer(wrongStats, 'apa', false, 'hati', 'vocab', now);
    progress.recordAnswer(wrongStats, 'satu', false, 'dua', 'vocab', now);
    const wrongList = practice.wrongItems(wrongStats).map((x) => x.ms).sort();
    const pairList = practice.confusablePairs(wrongStats).map((x) => x.a + '|' + x.b).sort();
    const dueList = practice.dueItems(wrongStats, now + 1000).map((x) => x.ms).sort();

    return {
      modes,
      deterministic: JSON.stringify(a.steps) === JSON.stringify(b.steps),
      differs: JSON.stringify(a.steps) !== JSON.stringify(c.steps),
      targets,
      wrongCount,
      confuseCount,
      reviewCount,
      afterOne, afterTwo, afterWrong, capped,
      wrongList, pairList, dueList
    };
  `);

  it('四种模式都绝不为空（记录不足时用全书词条补齐）', () => {
    ['wrong', 'confuse', 'review', 'mix'].forEach((mode) => {
      expect(practiceResult.modes[mode].count).toBeGreaterThan(0);
      expect(practiceResult.modes[mode].typed).toBe(true);
    });
  });

  it('同一个 seed 必得同一节课（确定性）', () => {
    expect(practiceResult.deterministic).toBe(true);
    expect(practiceResult.differs).toBe(true);
  });

  it('mix 模式按 wrong : confuse : review = 4 : 2 : 1 轮转取词', () => {
    expect(practiceResult.wrongCount).toBeGreaterThan(0);
    expect(practiceResult.confuseCount).toBeGreaterThan(0);
    expect(practiceResult.reviewCount).toBeGreaterThan(0);
    // 权重 4 : 2 : 1 → 错题占比最高
    expect(practiceResult.wrongCount).toBeGreaterThanOrEqual(practiceResult.confuseCount);
    expect(practiceResult.confuseCount).toBeGreaterThanOrEqual(practiceResult.reviewCount);
  });

  it('Leitner 间隔复习语义：答对升盒并按 0/1/2/4/7/15 天推迟，答错归零立即到期', () => {
    expect(practiceResult.afterOne.box).toBe(1);
    expect(practiceResult.afterOne.dueAt).toBe(1700000000000 + 1 * 86400000);
    expect(practiceResult.afterOne.wrong).toBe(0);
    expect(practiceResult.afterTwo.box).toBe(2);
    expect(practiceResult.afterTwo.dueAt).toBe(1700000000000 + 2 * 86400000);
    expect(practiceResult.afterWrong.box).toBe(0);
    expect(practiceResult.afterWrong.dueAt).toBe(1700000000000);
    expect(practiceResult.afterWrong.wrong).toBe(1);
    // 误选了别的词才记易混淆
    expect(practiceResult.afterWrong.confuse).toEqual(['apa|hati']);
  });

  it('答对时上限 5 盒，逾期时间最长 15 天', () => {
    expect(practiceResult.capped.box).toBe(5);
    expect(practiceResult.capped.dueAt).toBe(1700000000000 + 15 * 86400000);
  });

  it('错题本 / 易混淆 / 到期复习的统计口径正确', () => {
    expect(practiceResult.wrongList).toEqual(['apa', 'satu']);
    expect(practiceResult.pairList).toEqual(['apa|hati', 'satu|dua']);
    expect(practiceResult.dueList).toEqual(['apa', 'satu']);
  });
});

describe('马来语模块 · 进度存档（安全类）', () => {
  const store = runEngine(`
    const progress = await importModule(${JSON.stringify(ENGINE_PATHS.progress)});
    const makeStorage = (initial) => {
      const map = new Map(Object.entries(initial || {}));
      return {
        getItem: (k) => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => { map.set(k, String(v)); },
        removeItem: (k) => { map.delete(k); },
        keys: () => Array.from(map.keys())
      };
    };
    const migrated = progress.migrate({ xp: 10, sync: { code: 'Malay-abc', endpoint: 'https://example.com/exec', key: 's3cret', updatedAt: 5 } });
    const exported = progress.exportableState(migrated);
    const scrubbed = progress.migrate({ sync: { code: 'Malay-abc', endpoint: 'https://example.com/exec', key: 's3cret', updatedAt: 7 } });

    global.localStorage = makeStorage({ [progress.STORE_KEY]: '{not json' });
    const broken = progress.loadProgress();
    const backupKeys = global.localStorage.keys().filter((k) => k.indexOf(progress.STORE_KEY + '_broken_') === 0);
    const brokenInfo = {
      broken: broken.broken,
      xp: broken.state.xp,
      backupCount: backupKeys.length,
      backupRaw: backupKeys.length ? global.localStorage.getItem(backupKeys[0]) : null
    };

    global.localStorage = makeStorage({ [progress.LEGACY_STORE_KEY]: JSON.stringify({ xp: 42 }) });
    const legacy = progress.loadProgress();

    const keys = Object.keys(progress.migrate({ xp: 1 })).map((k) => k.toLowerCase());
    return {
      exportedSync: exported.sync === undefined ? 'absent' : 'present',
      exportedHasSecret: JSON.stringify(exported).indexOf('s3cret') >= 0,
      scrubbedSyncKeys: Object.keys(scrubbed.sync),
      scrubbedUpdatedAt: scrubbed.sync.updatedAt,
      version: progress.migrate({ v: 1, hearts: 99 }).v,
      heartsHigh: progress.migrate({ hearts: 99 }).hearts,
      heartsLow: progress.migrate({ hearts: -3 }).hearts,
      emptyState: {
        xp: progress.migrate(null).xp,
        done: progress.migrate(null).done,
        stats: progress.migrate(null).stats
      },
      storeKey: progress.STORE_KEY,
      legacyKey: progress.LEGACY_STORE_KEY,
      brokenInfo,
      legacyXp: legacy.state.xp,
      legacyBroken: legacy.broken,
      stateKeys: keys
    };
  `);

  it('导出的备份文件里没有任何同步配置（云同步未移植，本地等价物）', () => {
    expect(store.exportedSync).toBe('absent');
    expect(store.exportedHasSecret).toBe(false);
  });

  it('migrate 会把历史存档里的同步码 / 地址 / 密钥一并抹掉', () => {
    expect(store.scrubbedSyncKeys).toEqual(['updatedAt']);
    expect(store.scrubbedUpdatedAt).toBe(7);
  });

  it('存档强制升级到 v=2，心心被夹在 0..5，缺字段也不崩', () => {
    expect(store.version).toBe(2);
    expect(store.heartsHigh).toBe(5);
    expect(store.heartsLow).toBe(0);
    expect(store.emptyState.xp).toBe(0);
    expect(store.emptyState.done).toEqual({});
    expect(store.emptyState.stats).toEqual({ items: {}, confuse: {} });
  });

  it('存档键用 xmumdorm_malay_v1，读不到时回落到上游的 melayu_duolingo_v1', () => {
    expect(store.storeKey).toBe('xmumdorm_malay_v1');
    expect(store.legacyKey).toBe('melayu_duolingo_v1');
    expect(store.legacyXp).toBe(42);
    expect(store.legacyBroken).toBe(false);
  });

  it('读到的存档损坏时先备份原文再回退，绝不静默丢数据', () => {
    expect(store.brokenInfo.broken).toBe(true);
    expect(store.brokenInfo.xp).toBe(0);
    expect(store.brokenInfo.backupCount).toBe(1);
    expect(store.brokenInfo.backupRaw).toBe('{not json');
  });

  it('存档结构里不包含任何 token / 密钥类字段', () => {
    const forbidden = ['token', 'secret', 'password', 'apikey', 'api_key', 'credential'];
    forbidden.forEach((word) => {
      expect(store.stateKeys.some((k) => k.indexOf(word) >= 0)).toBe(false);
    });
  });
});

describe('马来语模块 · 界面与接入点', () => {
  const ui = runEngine(`
    const strings = await importModule(${JSON.stringify(ENGINE_PATHS.strings)});
    const achievements = await importModule(${JSON.stringify(ENGINE_PATHS.achievements)});
    const zh = strings.getMalayStrings(true);
    const en = strings.getMalayStrings(false);
    const defs = achievements.achievementDefs({ lessonsDone: 0, streak: 0, xp: 0 });
    const done = achievements.achievementDefs({ lessonsDone: 28, streak: 7, xp: 500 });
    return {
      zhKeys: Object.keys(zh).sort(),
      enKeys: Object.keys(en).sort(),
      zhCount: Object.keys(zh).length,
      campusNote: Boolean(zh.campus_note) && Boolean(en.campus_note),
      campusSyncNote: Boolean(zh.campus_sync_note) && Boolean(en.campus_sync_note),
      achCount: defs.length,
      achAllLocked: defs.every((d) => d.ok === false),
      achAllUnlocked: done.every((d) => d.ok === true)
    };
  `);

  it('组件里没有 innerHTML / dangerouslySetInnerHTML 之类的注入面', () => {
    const files = [
      MALAY_PAGE,
      readMalay('ui', 'PathView.jsx'),
      readMalay('ui', 'VocabView.jsx'),
      readMalay('ui', 'PracticeView.jsx'),
      readMalay('ui', 'AchievementsView.jsx'),
      readMalay('ui', 'StatsView.jsx'),
      readMalay('ui', 'SettingsView.jsx'),
      readMalay('ui', 'LessonOverlay.jsx'),
      readMalay('ui', 'parts.jsx')
    ];
    files.forEach((source) => {
      expect(source).not.toContain('dangerouslySetInnerHTML');
      expect(source).not.toMatch(/\.innerHTML\s*=/);
      expect(source).not.toMatch(/\beval\s*\(/);
      expect(source).not.toMatch(/new\s+Function\s*\(/);
      expect(source).not.toMatch(/\bwindow\.App\b/);
    });
  });

  it('音频三级降级：mp3 → 浏览器 TTS → 提示但不崩', () => {
    expect(AUDIO_JS).toContain("/malay/audio/");
    expect(AUDIO_JS).toContain('speechSynthesis');
    expect(AUDIO_JS).toContain('SpeechSynthesisUtterance');
    expect(AUDIO_JS).toContain('onerror');
    // 兜底失败时返回 false 而不是抛错
    expect(AUDIO_JS).toMatch(/catch\s*\{[\s\S]{0,80}return false;/);
  });

  it('路由与侧栏入口都已注册', () => {
    expect(LAYOUT_ROUTES).toContain("import('../features/malay/MalayPage')");
    expect(LAYOUT_ROUTES).toMatch(/path="malay"/);
    expect(SITE_SHELL_NAV).toMatch(/key:\s*'malay'/);
    expect(SITE_SHELL_NAV).toMatch(/to:\s*'\/malay'/);
  });

  it('中英文案键集合完全一致，并含本模块新增的两条说明', () => {
    expect(ui.zhKeys).toEqual(ui.enKeys);
    expect(ui.zhCount).toBe(169);
    expect(ui.campusNote).toBe(true);
    expect(ui.campusSyncNote).toBe(true);
  });

  it('设置页只保留本地备份的导出 / 导入（云同步未移植）', () => {
    expect(SETTINGS_VIEW).toContain('onExport');
    expect(SETTINGS_VIEW).toContain('onImport');
    expect(SETTINGS_VIEW).not.toMatch(/syncConnect|Sync\.setCfg|syncEndpoint/i);
  });

  it('成就定义共 9 项，达成判定随进度变化', () => {
    expect(ui.achCount).toBe(9);
    expect(ui.achAllLocked).toBe(true);
    expect(ui.achAllUnlocked).toBe(true);
  });
});
