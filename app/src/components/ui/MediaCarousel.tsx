import * as React from 'react';
import {Pressable,ScrollView,View} from 'react-native';
import {Image} from 'expo-image';
import {useTheme} from '@/design-system/theme';
import {ImageViewer} from './ImageViewer';
import {Text} from './Text';

/** Horizontal media reader for a real multi-image consumer; a single image stays visually simple. */
export function MediaCarousel({uris,alt,pageLabel,testID,zoomable=false}:{uris:readonly string[];alt?:readonly string[];pageLabel:(index:number,total:number)=>string;testID?:string;/** 点图打开全屏看图（要求在 `Screen` 子树内） */zoomable?:boolean}):React.ReactElement {
 const theme=useTheme();const [page,setPage]=React.useState(0);const [boxWidth,setBoxWidth]=React.useState(0);
 const [viewing,setViewing]=React.useState<number|null>(null);
 const viewer=viewing===null?null:<ImageViewer uris={uris} alt={alt} startIndex={viewing} onClose={()=>setViewing(null)}/>;
 const open=(index:number,child:React.ReactElement)=>zoomable?<Pressable testID={testID?`${testID}-open-${index}`:undefined} accessibilityRole="imagebutton" accessibilityLabel={alt?.[index]} onPress={()=>setViewing(index)} style={{width:'100%'}}>{child}</Pressable>:child;
 const onScroll=(event:{nativeEvent:{contentOffset:{x:number};layoutMeasurement:{width:number}}})=>{
  const width=event.nativeEvent.layoutMeasurement.width;
  if(width>0)setPage(Math.max(0,Math.min(uris.length-1,Math.round(event.nativeEvent.contentOffset.x/width))));
 };
 if(uris.length===0)return <View testID={testID}/>;
 if(uris.length===1){const label=alt?.[0];return <View testID={testID}>{open(0,<Image testID={testID?`${testID}-image-0`:undefined} source={{uri:uris[0]}} accessible={!!label} accessibilityLabel={label} accessibilityElementsHidden={!label} importantForAccessibility={label?undefined:'no-hide-descendants'} contentFit="cover" style={{width:'100%',aspectRatio:16/9,borderRadius:theme.radius('radius_small')}}/>)}{viewer}</View>;}
 return <View testID={testID} style={{gap:theme.space('space_1')}} onLayout={e=>setBoxWidth(e.nativeEvent.layout.width)}>
  <ScrollView testID={testID?`${testID}-scroll`:undefined} horizontal pagingEnabled onScroll={onScroll} scrollEventThrottle={16} showsHorizontalScrollIndicator={false} nestedScrollEnabled>
   {uris.map((uri,index)=>{const label=alt?.[index];return <View key={`${uri}-${index}`} style={{width:boxWidth>0?boxWidth:300,aspectRatio:16/9}}>{open(index,<Image testID={testID?`${testID}-image-${index}`:undefined} source={{uri}} accessible={!!label} accessibilityLabel={label} accessibilityElementsHidden={!label} importantForAccessibility={label?undefined:'no-hide-descendants'} contentFit="cover" style={{width:'100%',height:'100%',borderRadius:theme.radius('radius_small')}}/>)}</View>;})}
  </ScrollView>
  <View accessibilityLiveRegion="polite"><Text testID={testID?`${testID}-position`:undefined} role="caption">{pageLabel(page+1,uris.length)}</Text></View>
  {viewer}
 </View>;
}
