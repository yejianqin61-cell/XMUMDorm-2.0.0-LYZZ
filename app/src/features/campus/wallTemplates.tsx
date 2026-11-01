import * as React from 'react';
import { View } from 'react-native';
import Square from 'lucide-react-native/icons/square';

import { getTemplate, normalizeTemplateKey } from '../../../../shared/constants/confessionTemplates';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/design-system/theme';
import { useI18n, type MessageKey, type Translate } from '@/i18n';

const TEMPLATE_LABEL_KEYS: Readonly<Record<string, MessageKey>> = {
  bigtype: 'publish.wall.bigtype',
  letter: 'publish.wall.letter',
  note: 'publish.wall.note',
  announcement: 'publish.wall.announcement',
  dialogue: 'publish.wall.dialogue',
  checklist: 'publish.wall.checklist',
};

export function wallTemplateLabel(t: Translate, templateKey: unknown): string {
  return t(TEMPLATE_LABEL_KEYS[normalizeTemplateKey(templateKey)]);
}

function nonEmptyLines(content: string): string[] {
  const lines = content.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  return lines.length ? lines : [content];
}

/** Same type and body in feed, detail and the module's publish preview. */
export function WallTemplateBody({ templateKey, content }: { templateKey: unknown; content: string }): React.ReactElement {
  const { t } = useI18n();
  const theme = useTheme();
  return (
    <View style={{ gap: theme.space('space_2') }}>
      <Text role="caption" emphasis="strong" colorToken="text-brand" testID="wall-template-label">
        {wallTemplateLabel(t, templateKey)}
      </Text>
      <View testID="wall-template-content">
        <WallTemplateContent templateKey={templateKey} content={content} />
      </View>
    </View>
  );
}

/** Six D-5 layouts share plain text and the same accessibility contract. */
export function WallTemplateContent({ templateKey, content }: { templateKey: unknown; content: string }): React.ReactElement {
  const theme = useTheme();
  const key = getTemplate(normalizeTemplateKey(templateKey)).key;
  const lines = nonEmptyLines(content);
  if (key === 'bigtype') return <Text role="title" emphasis="strong" align="center">{content}</Text>;
  if (key === 'announcement') return <Text role="body" emphasis="strong">{content}</Text>;
  if (key === 'dialogue') return <View>{lines.map((line, index) => <Text key={`${index}-${line}`} role="body">{`“${line}”`}</Text>)}</View>;
  if (key === 'checklist') {
    // 品牌位装饰图标（Lucide 方框）替代文字符号 □（宪法 16 两层图标）；无标签 → 隐藏出无障碍树
    return (
      <View>
        {lines.map((line, index) => (
          <View key={`${index}-${line}`} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space('space_2') }}>
            <Icon source={Square} size="body" tint="secondary" testID={`wall-checklist-icon-${index}`} />
            <View style={{ flex: 1 }}><Text role="body">{line}</Text></View>
          </View>
        ))}
      </View>
    );
  }
  if (key === 'note') return <View>{lines.map((line, index) => <Text key={`${index}-${line}`} role="body">{`• ${line}`}</Text>)}</View>;
  return <Text role="body">{content}</Text>;
}
