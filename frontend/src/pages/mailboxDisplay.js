/**
 * 信箱通知的展示文案（纯函数，不依赖 React / JSX）
 *
 * 为什么单独成文件：
 *   服务端对匿名域通知（树洞 / 万能墙）**不再返回 `from_user`**（`routes/notifications.js`
 *   的 `ANONYMOUS_TYPES`）。于是"没有作者时显示什么"变成必须被钉住的行为 ——
 *   一旦有人改成直接读 `from_user.nickname`，用户就会看到 `undefined` 或空字符串。
 *   `.jsx` 页面在根仓库的 Jest 里无法加载（无 jsdom / 无 preset-react），
 *   所以把可测的纯函数抽到这里，由 `__tests__/web/mailboxAnonymousDisplay.test.js` 断言。
 *
 * ⛔ 本文件只做文案拼接：不得引入 React、路由或请求。
 */

/** 作者显示名。匿名域没有 `from_user` 时返回中性称呼（⛔ 不得返回 undefined） */
export function displayName(u) {
  if (!u) return 'Someone';
  return (u.nickname || u.username || 'Someone').trim();
}

/** 活动事务通知（报名成功 / 开始提醒 / 截止提醒） */
export function buildAffairsText({ isZh, latest }) {
  const title = latest?.extra?.targetTitle || latest?.target?.title || '';
  const titlePart = title ? (isZh ? `《${title}》` : `"${title}"`) : (isZh ? '该活动' : 'this activity');
  if (latest?.type === 'activity_deadline_reminder') {
    return isZh ? `${titlePart} 的报名即将截止，请及时处理。` : `Registration for ${titlePart} is closing soon.`;
  }
  if (latest?.type === 'activity_start_reminder') {
    return isZh ? `${titlePart} 即将开始，请留意活动安排。` : `${titlePart} is starting soon.`;
  }
  return isZh ? `你已成功报名 ${titlePart}。` : `You have successfully registered for ${titlePart}.`;
}

/** 二手交易通知（新消息 / 想要） */
export function buildMarketplaceText({ isZh, names, othersCount, contentTitle }) {
  const a = names[0] || (isZh ? '有人' : 'Someone');
  const b = names[1] || '';
  const others = othersCount > 0 ? othersCount : 0;
  const join2 = b ? (isZh ? `${a}、${b}` : `${a}, ${b}`) : a;
  const prefix = others > 0
    ? (isZh ? `${join2} 和另外 ${others} 人` : `${join2} and ${others} others`)
    : join2;
  const t = (contentTitle || '').trim();
  const titlePart = t ? (isZh ? `《${t}》` : `"${t}"`) : (isZh ? '该商品' : 'the item');
  return isZh ? `${prefix} 在二手市场就 ${titlePart} 发来新消息。` : `${prefix} sent a new message about ${titlePart}.`;
}

/**
 * 互动通知聚合文案（点赞 / 评论）。
 * ⚠️ 匿名域的通知不携带作者：此时 `names` 为空数组，前缀落到「有人 / Someone」。
 */
export function buildAggregateText({ isZh, names, othersCount, likeCount, commentCount, isPost, contentTitle }) {
  const a = names[0] || (isZh ? '有人' : 'Someone');
  const b = names[1] || '';
  const others = othersCount > 0 ? othersCount : 0;
  const join2 = b ? (isZh ? `${a}、${b}` : `${a}, ${b}`) : a;
  const prefix = others > 0
    ? (isZh ? `${join2} 和另外 ${others} 人` : `${join2} and ${others} others`)
    : join2;

  if (!isPost) {
    return isZh ? `${prefix} 更新了一条系统消息。` : `${prefix} triggered a system update.`;
  }

  const t = (contentTitle || '').trim();
  const titlePart = t ? (isZh ? `《${t}》` : `"${t}"`) : (isZh ? '你的帖子' : 'your post');
  if (likeCount > 0 && commentCount > 0) {
    return isZh ? `${prefix} 赞了或评论了 ${titlePart}。` : `${prefix} liked or commented on ${titlePart}.`;
  }
  if (commentCount > 0) {
    return isZh ? `${prefix} 评论了 ${titlePart}。` : `${prefix} commented on ${titlePart}.`;
  }
  return isZh ? `${prefix} 赞了 ${titlePart}。` : `${prefix} liked ${titlePart}.`;
}
