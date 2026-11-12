/**
 * 马来语学习模块的界面文案（中 / 英）。
 *
 * 文案逐字取自上游 MelayuDuolingo 的 i18n.js，键集合与上游保持一致，
 * 因此中文侧与英文侧的键一一对应，不会出现某一侧缺词。
 *
 * 与学习进度完全分离：进度存 localStorage，文案只跟着站点语言走。
 * 文案里的 {n}、{a} 等占位符由 formatMalay() 在渲染时替换。
 */
const I18N = {
  zh: {
    /* 侧栏 */
    nav_path: '学习路径', nav_vocab: '词汇本', nav_ach: '成就', nav_stats: '学习统计',
    daily_goal: '今日目标', goal_note: '完成一节课 +10 XP', goal_done: '今日目标已完成，太棒了！',
    goal_set: '设置目标', goal_target: '目标',
    stat_streak: '连续学习天数', stat_xp: '经验值', stat_hearts: '心心', stat_gems: '宝石',
    exit: '退出',

    /* 路径页 */
    path_title: '学习路径',
    path_sub: '共 {n} 个单元 · {m} 节课 · 依照《MPU1.1 Bahasa Melayu Komunikasi 2》教材编排',
    start_learn: '开始学习', continue_learn: '继续学习', start: '开始',
    unit_progress: '进度 {a}/{b}', locked_toast: '先完成上一课才能解锁哦',

    /* 课程页 */
    warmup: '词汇热身', practice: '实战练习', new_unit: '新单元', lesson_no: '第 {n} 课',
    will_learn: '本课你会学到', new_words: '{n} 个新词（看图选词、点击配对）',
    new_sentences: '{n} 组常用句（听音辨义、拼句成话）', grammar_point: '语法点：{n}',
    tip_intro: '小提示：点选项右边的 🔊 可以听发音；拼句题把词块点进上方句子框，拼好后点「检查」。',
    grammar_slide: '语法讲解',
    q_pick: '选出正确的马来语', q_grammar: '语法选择',
    q_match: '配对练习', q_match_sub: '先点左边的马来语，再点右边对应的中文',
    q_listen: '听音选义', q_listen_sub: '点击喇叭听马来语，选出中文意思',
    q_speak: '朗读练习', q_speak_sub: '听示范，然后大声跟读',
    q_arrange: '拼出这句话', q_arrange_sub: '用马来语拼出这句话',
    how_to_say: '「{a}」用马来语怎么说？', how_to_say_en: 'How do you say “{a}” in Malay?',
    listen_hint: '听一听正确答案的读音', tap_spk: '听发音：{a}',
    play_model: '🔊 播放示范', done_reading: '我读好了',
    check: '检查', cont: '继续', go: '开始',
    ready_go: '准备好了就开始吧', ready_grammar: '看完讲解，进入练习',
    right: '正确！', listen_right: '听对了！', read_done: '朗读完成！',
    wrong_again: '再想想… 正确答案是 {a}', wrong_order: '顺序不对，正确句子是：{a}',
    wrong_heard: '没听清？原文是：{a}', full_sentence: '完整句：{a}',
    match_all: '全部配对成功！', match_fail: '不匹配，请再试一次 ❌ (-1 ❤️)',
    keep_going: '继续保持，多读几遍更流利。', orig_text: '原文：{a}',
    no_voice: '设备未安装马来语语音包，发音可能不标准',
    no_browser_tts: '当前浏览器不支持朗读', no_tts_file: '没有找到马来语语音包，可参考下方原文',

    /* 完成页 */
    done_title: '课程完成！', wrong_label: '错误', streak_label: '连续天数',
    next_lesson: '下一课', back_path: '返回路径',
    fail_title: '心心用完啦！', fail_text: '别灰心，休息一下再来一次。答错的题会重新出现哦。',
    retry: '再来一次',

    /* 词汇本 */
    vocab_title: '词汇本',
    vocab_sub: '点击卡片翻转查看中文意思。共 {n} 个词条。',
    vocab_search: '搜索马来语或中文…', vocab_flip_hint: '点击卡片翻转查看释义。共 {n} 个词条。',

    /* 成就 */
    ach_title: '成就', ach_sub: '已解锁 {a} / {b}',
    ach_first: ['第一步', '完成第一节课'], ach_five: ['小有成就', '完成 5 节课'],
    ach_ten: ['坚持就是胜利', '完成 10 节课'], ach_streak3: ['三天连击', '连续学习 3 天'],
    ach_streak7: ['一周不断', '连续学习 7 天'], ach_xp100: ['百点经验', '累计获得 100 XP'],
    ach_xp500: ['五百点经验', '累计获得 500 XP'], ach_half: ['半程英雄', '完成一半课程（{n} 节课）'],
    ach_all: ['马来语达人', '完成全部 {n} 节课'], ach_unlocked: '解锁成就：{n}',

    /* 统计 */
    stats_title: '学习统计', stats_sub: '你的马来语学习进度一览',
    m_xp: '总经验值', m_streak: '连续天数', m_lessons: '完成课数', m_pct: '课程完成度',
    unit_progress_title: '各单元进度', reset_progress: '清空学习进度',
    reset_confirm: '确定要清空所有学习进度吗？',

    /* 个性化练习 */
    nav_practice: '个性化练习',
    practice_title: '个性化练习', practice_sub: '专攻你的错题、易混淆词和到期复习',
    pr_wrong_title: '错题本', pr_confuse_title: '易混淆', pr_review_title: '智能复习', pr_mix_title: '混合练习',
    pr_wrong_desc: '把做错过的题重新练一遍', pr_confuse_desc: '针对容易搞混的词',
    pr_review_desc: '按遗忘曲线安排复习', pr_mix_desc: '错题与复习混合出题',
    pr_start: '开始练习', pr_wrong_n: '错 {n} 次', pr_wrong_empty: '还没有错题，继续保持！',
    pr_confuse_empty: '还没有易混淆的词，继续保持！',
    pr_intro_sub: '共 {n} 题，全部来自你自己的学习记录',
    pr_intro_tip1: '答错的题会自动回到错题本', pr_intro_tip2: '连续答对会自动降低复习频率',
    practice_unavailable: '练习模块加载失败，请刷新页面重试', practice_empty: '暂时没有可练习的题目',

    /* 设置 / 数据 */
    nav_settings: '设置', set_title: '设置与数据', set_sub: '数据保存、备份与跨设备同步',
    set_local: '本地数据', set_storage: '浏览器存储', set_storage_ok: '正常',
    set_storage_bad: '不可用（隐私模式或被禁用）',
    set_last_save: '最后保存时间', set_never: '尚未保存',
    set_local_note: '学习进度保存在这台设备的浏览器里。换浏览器或清缓存前，建议先导出备份文件。',
    campus_note: '本模块运行在校园平台内：进度只保存在这台设备的浏览器中，未接入跨设备云同步。换设备前请先导出备份。',
    campus_sync_note: '云同步（跨设备备份）暂未接入校园平台，本地备份导出 / 导入已可用。',
    set_export: '导出备份文件', set_import: '导入备份文件',
    backup_exported: '备份文件已导出', backup_imported: '备份已恢复',
    backup_failed: '导出失败', backup_bad: '备份文件无法识别',
    set_cloud: '云同步（跨设备）',
    set_cloud_note: '填写同步码与同步地址后，数据会在本地保存的同时备份到云端；换设备输入同一个同步码即可恢复。同步码等同密码，请用不易猜到的随机串。',
    sync_code: '同步码', sync_endpoint: '同步地址', sync_key: '同步密钥（可选）',
    sync_status: '同步状态', sync_last: '最后同步时间',
    sync_off: '未开启', sync_ok: '已连接', sync_syncing: '同步中…', sync_error: '连接失败',
    sync_connect: '连接并上传', sync_pull: '仅下载云端数据', sync_off_btn: '断开同步',
    sync_guide_link: '第一次用？看看图文手册',
    sync_off_confirm: '确定要断开云同步吗？本地数据会保留。',
    sync_decrypt_failed: '云端数据无法解密（可能不是本机写入的数据），已保留本地进度。',
    sync_crypto_unavailable: '当前页面不是安全上下文（需要用 https 打开），已拒绝以明文上传数据。',
    sync_connecting: '正在连接同步服务…', sync_pulled: '已合并云端数据', sync_pushed: '已上传到云端',
    sync_no_remote: '云端还没有数据，已建立连接', sync_failed: '同步失败：',
    sync_need_fields: '请填写同步码和同步地址',
    set_danger: '危险操作', set_danger_note: '清空后无法恢复，建议先导出备份。',
    save_failed: '保存失败！请检查浏览器是否禁用了本地存储',
    save_recovered: '本地存储已恢复，学习进度已保存',

    /* 语言 */
    lang_label: '界面语言', lang_zh: '中文', lang_en: 'English', lang_switched: '已切换为 English（学习进度不受影响）'
  },

  en: {
    nav_path: 'Learning Path', nav_vocab: 'Vocabulary', nav_ach: 'Achievements', nav_stats: 'Progress',
    daily_goal: 'Daily Goal', goal_note: 'Finish a lesson · +10 XP', goal_done: 'Daily goal complete — amazing!',
    goal_set: 'Set goal', goal_target: 'Goal',
    stat_streak: 'Learning streak', stat_xp: 'Experience points', stat_hearts: 'Hearts', stat_gems: 'Gems',
    exit: 'Exit',

    path_title: 'Learning Path',
    path_sub: '{n} units · {m} lessons · based on the MPU1.1 Bahasa Melayu Komunikasi 2 coursebook',
    start_learn: 'Start learning', continue_learn: 'Continue', start: 'Start',
    unit_progress: 'Progress {a}/{b}', locked_toast: 'Finish the previous lesson to unlock this one',

    warmup: 'Vocabulary Warm-up', practice: 'Practice', new_unit: 'New unit', lesson_no: 'Lesson {n}',
    will_learn: 'In this lesson you will learn', new_words: '{n} new words (choose the word, match the pairs)',
    new_sentences: '{n} everyday sentences (listen and choose, build the sentence)', grammar_point: 'Grammar: {n}',
    tip_intro: 'Tip: tap the 🔊 next to an option to hear it; in build-the-sentence questions, tap the word tiles into the box above, then press Check.',
    grammar_slide: 'Grammar',
    q_pick: 'Choose the correct Malay', q_grammar: 'Grammar',
    q_match: 'Match the pairs', q_match_sub: 'Tap a Malay word on the left, then its English meaning on the right',
    q_listen: 'Listen and choose', q_listen_sub: 'Tap the speaker to hear the Malay sentence, then choose its meaning',
    q_speak: 'Speak it out', q_speak_sub: 'Listen to the model, then read it aloud',
    q_arrange: 'Build the sentence', q_arrange_sub: 'Build this sentence in Malay',
    how_to_say: 'How do you say “{a}” in Malay?', how_to_say_en: 'How do you say “{a}” in Malay?',
    listen_hint: 'Hear the correct pronunciation', tap_spk: 'Hear pronunciation: {a}',
    play_model: '🔊 Play model', done_reading: 'I’ve read it',
    check: 'Check', cont: 'Continue', go: 'Start',
    ready_go: 'Ready? Let’s begin', ready_grammar: 'That’s the grammar — on to practice',
    right: 'Correct!', listen_right: 'You heard it right!', read_done: 'Nicely read!',
    wrong_again: 'Not quite — the answer is {a}', wrong_order: 'Wrong order. The sentence is: {a}',
    wrong_heard: 'Didn’t catch it? It was: {a}', full_sentence: 'Full sentence: {a}',
    match_all: 'All pairs matched!', match_fail: 'Not a match — try again ❌ (-1 ❤️)',
    keep_going: 'Keep it up — read it a few more times.', orig_text: 'Original: {a}',
    no_voice: 'No Malay voice pack found on this device; pronunciation may be off',
    no_browser_tts: 'This browser cannot play speech', no_tts_file: 'No Malay voice found — see the text below',

    done_title: 'Lesson complete!', wrong_label: 'Mistakes', streak_label: 'Day streak',
    next_lesson: 'Next lesson', back_path: 'Back to path',
    fail_title: 'Out of hearts!', fail_text: 'No worries — take a break and try again. The questions come back around.',
    retry: 'Try again',

    vocab_title: 'Vocabulary',
    vocab_sub: 'Tap a card to flip it. {n} entries in total.',
    vocab_search: 'Search Malay or English…', vocab_flip_hint: 'Tap a card to flip it. {n} entries in total.',

    ach_title: 'Achievements', ach_sub: '{a} / {b} unlocked',
    ach_first: ['First steps', 'Finish your first lesson'], ach_five: ['Getting started', 'Finish 5 lessons'],
    ach_ten: ['Keep it up', 'Finish 10 lessons'], ach_streak3: ['Three in a row', 'Practise 3 days in a row'],
    ach_streak7: ['Full week', 'Practise 7 days in a row'], ach_xp100: ['Century', 'Earn 100 XP'],
    ach_xp500: ['High five hundred', 'Earn 500 XP'], ach_half: ['Halfway there', 'Finish half the course ({n} lessons)'],
    ach_all: ['Malay master', 'Finish all {n} lessons'], ach_unlocked: 'Achievement unlocked: {n}',

    stats_title: 'Progress', stats_sub: 'Your Malay learning at a glance',
    m_xp: 'Total XP', m_streak: 'Day streak', m_lessons: 'Lessons done', m_pct: 'Course complete',
    unit_progress_title: 'Progress by unit', reset_progress: 'Reset my progress',
    reset_confirm: 'Clear all your learning progress?',

    /* 个性化练习 */
    nav_practice: 'Practice',
    practice_title: 'Personalised Practice', practice_sub: 'Drill your mistakes, confusable words and due reviews',
    pr_wrong_title: 'Mistakes', pr_confuse_title: 'Confusables', pr_review_title: 'Smart Review', pr_mix_title: 'Mixed drill',
    pr_wrong_desc: 'Re-drill the items you got wrong', pr_confuse_desc: 'Focus on words you keep mixing up',
    pr_review_desc: 'Spaced review timed to your memory', pr_mix_desc: 'Mistakes and due reviews combined',
    pr_start: 'Start practice', pr_wrong_n: 'wrong {n}×', pr_wrong_empty: 'No mistakes yet — nice work!',
    pr_confuse_empty: 'No confusable words yet — nice work!',
    pr_intro_sub: '{n} questions, all drawn from your own study history',
    pr_intro_tip1: 'Anything you miss goes straight into your mistake list',
    pr_intro_tip2: 'Correct answers push the review further out',
    practice_unavailable: 'Practice module failed to load — please refresh',
    practice_empty: 'Nothing to practise right now',

    /* 设置 / 数据 */
    nav_settings: 'Settings', set_title: 'Settings & Data', set_sub: 'Saving, backups and cross-device sync',
    set_local: 'Local data', set_storage: 'Browser storage', set_storage_ok: 'Available',
    set_storage_bad: 'Unavailable (private mode or blocked)',
    set_last_save: 'Last saved', set_never: 'Never',
    set_local_note: 'Progress is stored in this browser. Export a backup before clearing data or switching browsers.',
    campus_note: 'This module runs inside the campus platform: progress is kept only in this browser and cross-device cloud sync is not connected. Export a backup before switching devices.',
    campus_sync_note: 'Cloud sync (cross-device backup) is not connected to the campus platform yet; local export / import works.',
    set_export: 'Export backup', set_import: 'Import backup',
    backup_exported: 'Backup exported', backup_imported: 'Backup restored',
    backup_failed: 'Export failed', backup_bad: 'Unrecognised backup file',
    set_cloud: 'Cloud sync (cross-device)',
    set_cloud_note: 'Add your sync code and endpoint to mirror progress to the cloud; enter the same code on another device to restore it. Treat the sync code like a password.',
    sync_code: 'Sync code', sync_endpoint: 'Sync endpoint', sync_key: 'Sync key (optional)',
    sync_status: 'Status', sync_last: 'Last sync',
    sync_off: 'Off', sync_ok: 'Connected', sync_syncing: 'Syncing…', sync_error: 'Connection failed',
    sync_connect: 'Connect & upload', sync_pull: 'Download only', sync_off_btn: 'Disconnect',
    sync_guide_link: 'First time? Open the step-by-step guide',
    sync_off_confirm: 'Disconnect cloud sync? Local data is kept.',
    sync_decrypt_failed: 'Remote data could not be decrypted (not written by this device); local progress kept.',
    sync_crypto_unavailable: 'This page is not a secure context (open it via https); refusing to upload data in plaintext.',
    sync_connecting: 'Connecting to the sync service…', sync_pulled: 'Cloud data merged', sync_pushed: 'Uploaded to the cloud',
    sync_no_remote: 'No cloud data yet — connected', sync_failed: 'Sync failed: ',
    sync_need_fields: 'Enter a sync code and an endpoint',
    set_danger: 'Danger zone', set_danger_note: 'This cannot be undone — export a backup first.',
    save_failed: 'Save failed! Check whether the browser blocks local storage',
    save_recovered: 'Storage recovered — progress saved',

    lang_label: 'Interface language', lang_zh: '中文', lang_en: 'English', lang_switched: 'Switched to 中文 — your progress is unchanged'
  }
};
const ZH = I18N.zh;
const EN = I18N.en;

/** 取当前语言的文案表 */
export function getMalayStrings(isZh) {
  return isZh ? ZH : EN;
}

/** 把文案里的 {name} 占位符替换成实参 */
export function formatMalay(template, vars) {
  if (typeof template !== 'string') return template;
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    vars && vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : match
  );
}
