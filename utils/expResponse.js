/** 将经验结果挂到 API 响应体 */
function formatExpPublic(result) {
  if (!result) return null;
  const delta = Number(result.delta) || 0;
  if (!delta && !result.levelUp) return null;
  return {
    delta,
    total: result.total,
    level: result.level,
    levelUp: !!result.levelUp,
    previousLevel: result.previousLevel ?? null,
    badge: result.badge ?? null,
    badgeLabel: result.badgeLabel ?? null,
    messages: result.messages || [],
  };
}

function attachExp(body, expResult) {
  const exp = formatExpPublic(expResult);
  if (!exp) return body;
  return { ...body, exp };
}

module.exports = { formatExpPublic, attachExp };
