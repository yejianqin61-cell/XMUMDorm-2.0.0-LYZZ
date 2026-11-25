import * as React from 'react';
import {Pressable, ScrollView, View} from 'react-native';

import {useTheme} from '@/design-system/theme';
import {useI18n, type MessageKey} from '@/i18n';
import {Badge} from './Badge';
import {Text} from './Text';

export type UnderlineFilterOption = {key: string; labelKey: MessageKey; /** 未读数等角标；0 不画 */ count?: number};

/** Single-select filtering is not secondary navigation: it deliberately uses button semantics. */
export function UnderlineFilter({options, selectedKey, onSelect, testID, tone = 'primary'}: {
  /** 两行筛选时第二行用 `light`：指示线更细、文字更轻，避免两行一样重（） */
  tone?: 'primary' | 'light';
  options: readonly UnderlineFilterOption[];
  selectedKey: string;
  onSelect: (key: string) => void;
  testID?: string;
}): React.ReactElement | null {
  const theme = useTheme();
  const {t} = useI18n();
  if (options.length === 0) return null;
  return <ScrollView testID={testID} horizontal style={{flexGrow: 0}} showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: theme.space('space_4')}}>
    {options.map((option) => {
      const selected = option.key === selectedKey;
      return <Pressable key={option.key} testID={testID ? `${testID}-${option.key}` : undefined} accessibilityRole="button" accessibilityState={{selected}}
        accessibilityLabel={t(option.labelKey)} onPress={() => onSelect(option.key)}
        style={{minHeight: theme.touchTarget, minWidth: theme.space('space_12'), justifyContent: 'center', paddingHorizontal: theme.space('space_3'), marginRight: theme.space('space_2')}}>
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.space('space_1')}}>
          <Text role="label" align="center" numberOfLines={2} emphasis={selected && tone === 'primary' ? 'strong' : 'regular'} colorToken={selected ? 'text-brand' : 'text-secondary'}>{t(option.labelKey)}</Text>
          {option.count ? <Badge count={option.count} tone="accent" /> : null}
        </View>
        <View style={{height: tone === 'light' ? theme.borderWidth('border_width_hairline') * 2 : theme.borderWidth('border_width_brutal'), marginTop: theme.space('space_1'), backgroundColor: selected ? theme.color['border-brand'].value : 'transparent'}} />
      </Pressable>;
    })}
  </ScrollView>;
}
