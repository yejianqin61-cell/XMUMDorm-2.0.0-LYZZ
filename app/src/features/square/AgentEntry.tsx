import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Icon } from '@/components/ui/Icon';
import { Pressable } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import { useI18n } from '@/i18n';

export function AgentEntry(): React.ReactElement {
  const theme = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  return <Pressable testID="square-agent-entry" accessibilityLabel={t('screen.agent.title')} onPress={() => router.push('/agent')}
    contentAlign="stretch" style={{ paddingHorizontal: theme.space('space_3'), paddingVertical: theme.space('space_3'), borderRadius: theme.radius('radius_large'),
      backgroundColor: theme.color['bg-surface'].value }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space('space_3') }}>
      <Icon source={MessageCircle} size="body" tint="brand" />
      <View style={{ flex: 1 }}><Text role="body" emphasis="strong">{t('screen.agent.title')}</Text></View>
      <Icon source={ChevronRight} size="body" tint="secondary" />
    </View>
  </Pressable>;
}
