import * as React from 'react';
import {View} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {MediaPicker} from '@/components/ui/MediaPicker';
import {useI18n} from '@/i18n';
import {useTheme} from '@/design-system/theme';
import type {PublishImage} from './images';

export function PublishMedia({value,onChange,disabled,max,allowGif}: {value:unknown;onChange:(next:unknown)=>void;disabled:boolean;max:number;allowGif:boolean}) {
 const {t}=useI18n();const theme=useTheme();
 const images:PublishImage[]=Array.isArray(value)?value:[];
 const slots=Math.min(images.length+1,max);
 return <View style={{gap:theme.space('space_3')}}>{Array.from({length:slots},(_,index)=>{
  const image=images[index];
  return <MediaPicker key={index} testID={`publish-image-${index}`} value={image?{uri:image.uri,mimeType:image.type,sizeBytes:image.size}:null}
   disabled={disabled} allowGif={allowGif} maxBytes={8*1024*1024} pickLabel={t('publish.bing.images')} removeLabel={t('publish.media.remove')} replaceLabel={t('publish.media.replace')}
   tooLargeLabel={t('publish.media.tooLarge')} gifNotAllowedLabel={t('publish.media.gifDenied')} failureLabel={t('publish.media.failed')}
   onPick={async()=>{
    const picked=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:false,quality:1});
    if(picked.canceled)return {ok:false,reason:'cancelled'};
    const asset=picked.assets[0];
    if(!asset?.uri||!asset.mimeType||!['image/jpeg','image/png','image/webp','image/gif'].includes(asset.mimeType)||!asset.fileSize)return {ok:false,reason:'failed'};
    return {ok:true,image:{uri:asset.uri,mimeType:asset.mimeType,sizeBytes:asset.fileSize}};
   }} onChange={picked=>{
    const next=[...images];
    if(picked){const extension=picked.mimeType?.split('/')[1]??'jpg';next[index]={uri:picked.uri,name:`upload-${index}.${extension}`,type:picked.mimeType??'image/jpeg',size:picked.sizeBytes??0};}
    else next.splice(index,1);
    onChange(next);
   }}/>
 })}</View>;
}
