import { useSyncExternalStore } from 'react';

// Shared only within this tab. Refresh resets all demo interactions.
let snapshot = {};
const listeners = new Set();
const subscribe = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
const getSnapshot = () => snapshot;
export function useCampusNewsInteraction(post) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const current = state[post.id] || { liked: post.liked, favorited: post.favorited };
  const toggle = (field) => {
    const before = snapshot[post.id] || { liked: post.liked, favorited: post.favorited };
    snapshot = { ...snapshot, [post.id]: { ...before, [field]: !before[field] } };
    listeners.forEach((listener) => listener());
  };
  return { ...current, onLike: () => toggle('liked'), onFavorite: () => toggle('favorited') };
}

export function campusNewsPreviewPath(id) {
  if (!String(id).startsWith('demo-news-')) throw new Error('Preview requires a demo news ID');
  return `/about/campus/preview/${encodeURIComponent(id)}`;
}

// Scope scroll restoration to this feed; public layout rules remain untouched.
let feedScroll = null;
export function captureCampusNewsScroll() {
  const root = document.querySelector('.square-news-home');
  feedScroll = {
    window: window.scrollY, root: root?.scrollTop || 0,
    main: root?.closest('.app-main')?.scrollTop || 0,
    pane: root?.closest('.tab-stack-pane')?.scrollTop || 0,
  };
}
export function restoreCampusNewsScroll() {
  if (!feedScroll) return;
  const root = document.querySelector('.square-news-home');
  if (root) root.scrollTop = feedScroll.root;
  const main = root?.closest('.app-main');
  const pane = root?.closest('.tab-stack-pane');
  if (main) main.scrollTop = feedScroll.main;
  if (pane) pane.scrollTop = feedScroll.pane;
  window.scrollTo(0, feedScroll.window);
}
