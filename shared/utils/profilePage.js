export function parsePositiveUserId(value) {
  const text = String(value == null ? '' : value);
  if (!/^[1-9]\d*$/.test(text)) return 0;
  const userId = Number(text);
  return Number.isSafeInteger(userId) ? userId : 0;
}

export function appendUniquePosts(currentPosts, nextPosts) {
  const knownIds = new Set(currentPosts.map((post) => post.id));
  return [...currentPosts, ...nextPosts.filter((post) => !knownIds.has(post.id))];
}
