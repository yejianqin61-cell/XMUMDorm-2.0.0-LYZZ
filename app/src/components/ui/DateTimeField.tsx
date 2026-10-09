import * as React from 'react';
import { Platform, View } from 'react-native';
import NativeDateTimePicker from '@react-native-community/datetimepicker';
import { useI18n } from '@/i18n';
import { useTheme } from '@/design-system/theme';
import { Button } from './Button';

/** C15/C16 share the platform picker; values stay in local calendar/time form. */
export function DateTimeField({ mode, value, onChange, disabled = false, min, max, testID }: {
  mode: 'date' | 'time'; value: string; onChange: (value: string) => void; disabled?: boolean; min?: Date; max?: Date; testID?: string;
}): React.ReactElement {
  const { t } = useI18n();
  const theme = useTheme();
  const [open, setOpen] = React.useState(false);
  const [candidate, setCandidate] = React.useState<Date | null>(null);
  const selected = new Date();
  if (mode === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number); selected.setFullYear(year, month - 1, day); selected.setHours(12, 0, 0, 0);
  } else if (mode === 'time' && /^\d{2}:\d{2}$/.test(value)) {
    const [hours, minutes] = value.split(':').map(Number); selected.setHours(hours, minutes, 0, 0);
  }
  const pad = (number: number) => String(number).padStart(2, '0');
  if (Platform.OS === 'web') return <View style={{gap:theme.space('space_2')}}>
    {React.createElement('input', {type:mode, value, disabled, 'data-testid':testID, 'aria-label':t(mode === 'date' ? 'tools.todos.chooseDate' : 'tools.todos.chooseTime'),
      onChange:(event:{currentTarget:{value:string}})=>onChange(event.currentTarget.value),
      onInput:(event:{currentTarget:{value:string}})=>onChange(event.currentTarget.value),
      style:{color:theme.color['text-primary'].value,backgroundColor:theme.color['bg-surface'].value,padding:theme.space('space_3')}})}
    {value?<Button label={t('tools.todos.clearValue')} variant="ghost" disabled={disabled} onPress={()=>onChange('')}/>:null}
  </View>;
  return <View style={{ gap: theme.space('space_2') }}>
    <View style={{ flexDirection: 'row', gap: theme.space('space_2') }}>
      <Button testID={testID} variant="secondary" label={value || t(mode === 'date' ? 'tools.todos.chooseDate' : 'tools.todos.chooseTime')} disabled={disabled} onPress={() => { setCandidate(null); setOpen(true); }} />
      {value ? <Button testID={testID ? `${testID}-clear` : undefined} variant="ghost" label={t('tools.todos.clearValue')} disabled={disabled} onPress={() => { setOpen(false); onChange(''); }} /> : null}
    </View>
    {open && !disabled ? <>
      <NativeDateTimePicker testID={testID ? `${testID}-native` : undefined} value={candidate ?? selected} mode={mode} is24Hour display={Platform.OS === 'ios' ? 'spinner' : 'default'} minimumDate={min} maximumDate={max}
        onValueChange={(_, date) => {
          if (Platform.OS === 'ios') { setCandidate(date); return; }
          setOpen(false);
          onChange(mode === 'date' ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` : `${pad(date.getHours())}:${pad(date.getMinutes())}`);
        }} onDismiss={() => setOpen(false)} />
      {Platform.OS === 'ios' ? <View style={{ flexDirection: 'row', gap: theme.space('space_2') }}>
        <Button label={t('tools.todos.confirmValue')} variant="secondary" onPress={() => {
          const date = candidate ?? selected;
          onChange(mode === 'date' ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` : `${pad(date.getHours())}:${pad(date.getMinutes())}`);
          setOpen(false);
        }} />
        <Button label={t('action.cancel')} variant="ghost" onPress={() => setOpen(false)} />
      </View> : null}
    </> : null}
  </View>;
}
