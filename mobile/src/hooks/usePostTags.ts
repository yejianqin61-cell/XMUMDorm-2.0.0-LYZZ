import { useState, useEffect } from 'react';
import { getPostTagsList } from '../api/posts';
import { getVisibleTags } from '../api/tags';

export interface TagItem {
  id: number;
  slug: string;
  name_zh?: string;
  name_en?: string;
}

/**
 * Custom hook for fetching and managing post tags.
 * For logged-in users, loads their personalized tag visibility.
 * Falls back to the default top-10 tags.
 */
export function usePostTags(isLoggedIn: boolean) {
  const [tags, setTags] = useState<TagItem[]>([]);

  useEffect(() => {
    (async () => {
      try {
        if (isLoggedIn) {
          const data = await getVisibleTags();
          const visible: TagItem[] = data?.visible || [];
          if (visible.length) {
            setTags(visible);
            return;
          }
        }
        const list = await getPostTagsList();
        setTags(Array.isArray(list) ? list.slice(0, 10) : []);
      } catch {
        setTags([]);
      }
    })();
  }, [isLoggedIn]);

  return { tags };
}
