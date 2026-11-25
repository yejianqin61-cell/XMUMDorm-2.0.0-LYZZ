import { useQuery } from '@tanstack/react-query';
import { requestMoodleDeadlines } from '@shared/utils/moodleBridge';

/**
 * 读「厦马小筑 · Moodle 截止日期」扩展存在本机的截止投影。
 * 没装扩展 / 手机浏览器：约 0.8 秒后得到 { installed: false }，页面照常显示。
 */
export function useMoodleDeadlines(enabled) {
  return useQuery({
    queryKey: ['moodle', 'extension-bridge'],
    queryFn: () => requestMoodleDeadlines(),
    enabled: !!enabled,
    staleTime: 60 * 1000,
    retry: false,
    refetchOnWindowFocus: true,
  });
}
