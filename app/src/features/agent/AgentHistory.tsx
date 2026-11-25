import * as React from 'react';
import { View } from 'react-native';
import Trash2 from 'lucide-react-native/icons/trash';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { InlineNotice } from '@/components/ui/InlineNotice';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { useScreenInsets } from '@/components/ui/Screen';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';
import type { useAgent } from './useAgent';

export function AgentHistory({ agent }: { agent: ReturnType<typeof useAgent> }): React.ReactElement {
  const { t, locale } = useI18n();
  const theme = useTheme();
  const { insets } = useScreenInsets();
  return <BottomSheet testID="agent-history" visible={agent.historyOpen} title={t('screen.agent.history')}
    closeLabel={t('screen.agent.closeHistory')} bottomInset={insets.bottom} heightRatio={0.65} onClose={agent.closeHistory}>
    <Button label={t('screen.agent.new')} variant="secondary" disabled={agent.historyBusy} onPress={agent.newConversation} />
    {agent.deleted ? <InlineNotice testID="agent-deleted" message={t('screen.agent.deleted')} actionLabel={agent.historyBusy ? undefined : t('screen.agent.undo')}
      onAction={() => { if (agent.deleted) void agent.changeHistory(agent.deleted, true); }} /> : null}
    {agent.historyError ? <InlineNotice tone="warning" message={t(agent.historyError)} actionLabel={agent.historyBusy ? undefined : t('action.retry')} onAction={() => void agent.loadHistory()} /> : null}
    {agent.historyLoading ? <Text role="body" colorToken="text-secondary">{t('screen.agent.loadingHistory')}</Text>
      : agent.history.length === 0 && !agent.historyError ? <Text role="body" colorToken="text-secondary">{t('screen.agent.noHistory')}</Text>
        : agent.history.map(entry => {
          const title = entry.id === 'main' ? t('screen.agent.legacy') : entry.title === '新会话' ? t('screen.agent.new') : entry.title;
          const date = entry.created_at > 0 ? new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-GB', {
            timeZone: 'Asia/Kuala_Lumpur', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          }).format(new Date(entry.created_at * 1000)) : t('screen.agent.earlier');
          return <View key={entry.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable testID={`agent-open-${entry.id}`} accessibilityLabel={title} disabled={agent.historyBusy} onPress={() => agent.openConversation(entry)}
              contentAlign="stretch" style={{ flex: 1, minWidth: 0, paddingVertical: theme.space('space_3'), gap: theme.space('space_1') }}>
              <Text role="body" colorToken="text-primary" numberOfLines={2}>{title}</Text>
              <Text role="caption" colorToken="text-secondary">{date}</Text>
            </Pressable>
            <IconButton testID={`agent-delete-${entry.id}`} Icon={Trash2} accessibilityLabel={t('screen.agent.delete', { title })}
              disabled={agent.historyBusy} onPress={() => void agent.changeHistory(entry)} />
          </View>;
        })}
  </BottomSheet>;
}
