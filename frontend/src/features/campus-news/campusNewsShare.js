export function campusNewsShareUrl(postId, origin) {
  if (!/^[1-9]\d*$/.test(String(postId))) throw new Error('Invalid news ID');
  const base = new URL(origin);
  if (!['http:', 'https:'].includes(base.protocol)) throw new Error('Invalid origin');
  return new URL(`/about/campus/${postId}`, base.origin).href;
}

// Matches the existing Clipboard API + Toast pattern in JoinUs/ClubDirectoryPage.
export async function copyCampusNewsLink(postId, origin, clipboard) {
  const url = campusNewsShareUrl(postId, origin);
  if (!clipboard?.writeText) throw new Error('Clipboard unavailable');
  await clipboard.writeText(url);
  return url;
}
