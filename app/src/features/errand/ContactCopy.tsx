import * as React from 'react';
import {Platform} from 'react-native';
import {Button} from '@/components/ui/Button';
import {Text} from '@/components/ui/Text';
import {useI18n} from '@/i18n';
export async function copyWebContact(value:string): Promise<void> {
 if(Platform.OS!=='web' || !globalThis.navigator?.clipboard)throw new Error('Clipboard unavailable');
 await globalThis.navigator.clipboard.writeText(value);
}
export function ContactCopy({value}:{value:string}) {
 const {t}=useI18n();const [status,setStatus]=React.useState<'success'|'failed'|null>(null);
 if(Platform.OS!=='web')return null;
 return <><Button label={t('screen.errand.contact.copy')} onPress={()=>{void copyWebContact(value).then(()=>setStatus('success'),()=>setStatus('failed'));}}/>
 {status?<Text role="body">{t(status==='success'?'screen.errand.contact.copied':'screen.errand.contact.failed')}</Text>:null}</>;
}
