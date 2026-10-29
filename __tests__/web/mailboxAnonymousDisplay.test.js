/**
 * Web 端匿名通知展示回归（补测阶段3-01 的 Web 侧）
 *
 * 背景：`routes/notifications.js` 对匿名域（树洞/万能墙）不再返回 `from_user`，
 *       Web 信箱只剩"没有作者"这一种输入。若展示层任何一处依赖作者字段，
 *       用户会看到 `undefined`、空字符串或"管理员"这类错误身份。
 *
 * 断言的是 `mailboxDisplay.js` 的纯函数（不依赖 JSX/React）：
 *   匿名 → 中性称呼「有人 / Someone」；有名 → 用名字；⛔ 不得出现 undefined/null。
 *
 * ⚠️ 必须用 `npm test`（带 `--experimental-vm-modules`）跑：`frontend/` 是 `type:module`，
 *    裸 `npx jest` 无法加载它的 ESM 模块（仓库既有 4 个 web 用例同理）。
 */
let displayName, buildAggregateText, buildMarketplaceText;

beforeAll(async () => {
  ({
    displayName,
    buildAggregateText,
    buildMarketplaceText,
  } = await import('../../frontend/src/pages/mailboxDisplay.js'));
});

const anonymousLike = {
  isZh: true,
  names: [],
  othersCount: 0,
  likeCount: 1,
  commentCount: 0,
  isPost: true,
  contentTitle: '二手自行车',
};

describe('Web 匿名通知展示', () => {
  it('匿名点赞（无 from_user）用中性称呼，不泄露身份', () => {
    const text = buildAggregateText(anonymousLike);
    expect(text).toBe('有人 赞了 《二手自行车》。');
    expect(text).not.toMatch(/undefined|null|Someone/);
  });

  it('英文界面同样中性', () => {
    expect(buildAggregateText({ ...anonymousLike, isZh: false })).toBe(
      'Someone liked "二手自行车".'
    );
  });

  it('没有内容标题时回落到"你的帖子"，不出现空串或 undefined', () => {
    const text = buildAggregateText({ ...anonymousLike, contentTitle: '' });
    expect(text).toBe('有人 赞了 你的帖子。');
    expect(text).not.toMatch(/undefined|null/);
  });

  it('displayName 对缺失作者返回 Someone，对真实作者保留昵称', () => {
    expect(displayName(undefined)).toBe('Someone');
    expect(displayName(null)).toBe('Someone');
    expect(displayName({ nickname: ' 甲 ' })).toBe('甲');
    expect(displayName({ username: 'jia' })).toBe('jia');
  });

  it('有作者时仍能显示名字与"和另外 N 人"', () => {
    expect(
      buildAggregateText({
        ...anonymousLike,
        names: ['甲', '乙'],
        othersCount: 1,
        contentTitle: '书',
      })
    ).toBe('甲、乙 和另外 1 人 赞了 《书》。');
  });

  it('二手会话文案在无作者时也是中性（同一降级规则）', () => {
    const text = buildMarketplaceText({
      isZh: true,
      names: [],
      othersCount: 0,
      contentTitle: '台灯',
    });
    expect(text).toBe('有人 在二手市场就 《台灯》 发来新消息。');
    expect(text).not.toMatch(/undefined|null/);
  });
});
