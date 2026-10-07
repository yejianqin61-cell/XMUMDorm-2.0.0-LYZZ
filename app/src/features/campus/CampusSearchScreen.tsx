import * as React from 'react';
import {useRouter} from 'expo-router';
import {Screen} from '@/components/ui/Screen';
import {SearchField} from '@/components/ui/SearchField';
import {Button} from '@/components/ui/Button';
import {Text} from '@/components/ui/Text';
import {useI18n} from '@/i18n';
import {CampusFeed} from './CampusScreens';

/** Business composition of P14; search never writes either browsing tab's state. */
export function CampusSearchScreen():React.ReactElement {
 const {t}=useI18n();const router=useRouter();
 const [draft,setDraft]=React.useState(''),[query,setQuery]=React.useState('');
 const [history,setHistory]=React.useState<string[]>([]);
 const submit=React.useCallback((value:string)=>{
  const next=value.trim().slice(0,200);
  setQuery(next);
  if(next)setHistory(items=>[next,...items.filter(item=>item!==next)].slice(0,5));
 },[]);
 // Keep requests quiet during typing; explicit submit bypasses the debounce.
 React.useEffect(()=>{
  const timer=setTimeout(()=>submit(draft),400);
  return()=>clearTimeout(timer);
 },[draft,submit]);
 const change=(value:string)=>{setDraft(value);setQuery('');};
 return <Screen titleKey="screen.campus.search.title" showMailbox={false} testID="campus-search">
  <Button label={t('action.back')} onPress={()=>router.canGoBack()?router.back():router.replace('/campus' as never)}/>
  <SearchField value={draft} onChangeText={change} onSubmit={()=>submit(draft)} appearance="full"
   placeholder={t('screen.campus.search.placeholder')} clearLabel={t('screen.campus.search.clear')} testID="campus-search-field"/>
  <Button label={t('screen.campus.search.submit')} testID="campus-search-submit" onPress={()=>submit(draft)}/>
  {query?<><Text role="label">{t('screen.campus.search.results')}</Text>
   <Button label={t('screen.campus.search.change')} onPress={()=>change('')}/>
   <CampusFeed key={query} kind="confession" query={query}/></>:<>
   <Text>{t('screen.campus.search.hint')}</Text>
   {history.length>0?<><Text role="label">{t('screen.campus.search.history')}</Text>
    {history.map(item=><Button key={item} label={item} onPress={()=>{setDraft(item);submit(item);}}/>) }
    <Button label={t('screen.campus.search.clearHistory')} onPress={()=>setHistory([])}/></>:null}
  </>}
 </Screen>;
}
