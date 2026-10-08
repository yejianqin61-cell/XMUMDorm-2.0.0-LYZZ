import * as React from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { useTheme } from '@/design-system/theme';
import { Select } from './Select';
import { TextArea } from './TextArea';
import { Text } from './Text';
import { AlertDialog } from './AlertDialog';
import {useScreenInsets} from './Screen';
import { Button } from './Button';

/** O14 controlled report form. Business submission and authentication belong to the caller. */
export function ReportSheet({visible, reasons, reason, detail, onReason, onDetail, onSubmit, onCancel, busy, message, labels, bottomInset, action, maxDetailLength}: {
 visible: boolean; reasons: readonly {value: string; label: string}[]; reason: string | null; detail: string;
 onReason: (value: string) => void; onDetail: (value: string) => void; onSubmit: () => void; onCancel: () => void;
 maxDetailLength: number; busy: boolean; message?: string; bottomInset?: number; action?: {label: string; onPress: () => void};
 labels: {title: string; reason: string; detail: string; submit: string; cancel: string};
}) {
 const theme = useTheme();
 const screen=useScreenInsets();
 const bottom=bottomInset??screen.insets.bottom;
 const [confirm,setConfirm]=React.useState(false);
 React.useEffect(()=>{if(!visible)setConfirm(false);},[visible]);
 return <Modal visible={visible} transparent animationType="none" onRequestClose={() => {if (!busy) onCancel();}}>
  <View style={{flex: 1, paddingTop:screen.insets.top, paddingHorizontal:Math.max(screen.insets.left,screen.insets.right), justifyContent: 'flex-end', backgroundColor: theme.color['bg-canvas'].value}}>
   <ScrollView accessibilityViewIsModal contentContainerStyle={{padding: theme.space('space_4'), paddingBottom: bottom + theme.space('space_4'), gap: theme.space('space_3'), backgroundColor: theme.color['bg-surface'].value}} keyboardShouldPersistTaps="handled">
    <Text role="label">{labels.title}</Text>
    <Select label={labels.reason} options={reasons} value={reason} onChange={onReason} disabled={busy}/>
    <TextArea label={labels.detail} value={detail} onChangeText={onDetail} maxLength={maxDetailLength} counter disabled={busy}/>
    {message ? <Text role="body">{message}</Text> : null}
    {action ? <Button label={action.label} onPress={action.onPress}/> : null}
    <Button testID="report-submit" label={labels.submit} loading={busy} disabled={!reason || busy} onPress={()=>setConfirm(true)}/>
    <Button label={labels.cancel} variant="ghost" disabled={busy} onPress={onCancel}/>
   </ScrollView>
   <AlertDialog testID="report-confirm" visible={confirm} title={labels.title} confirmLabel={labels.submit} cancelLabel={labels.cancel} onCancel={()=>setConfirm(false)} onConfirm={()=>{setConfirm(false);onSubmit();}}/>
  </View>
 </Modal>;
}
