import * as React from 'react';
import {Text} from '@/components/ui/Text';

/** Literal matching: punctuation in a keyword is never interpreted as a regex. */
export function SearchHighlight({value,query}:{value:string;query:string}):React.ReactElement {
 const pieces:React.ReactNode[]=[];
 const source=value.toLowerCase(),needle=query.toLowerCase();
 let cursor=0,index=needle?source.indexOf(needle): -1;
 while(index>=0){
  pieces.push(value.slice(cursor,index));
  pieces.push(<Text key={index} emphasis="strong" testID="campus-search-match">{value.slice(index,index+query.length)}</Text>);
  cursor=index+query.length;index=source.indexOf(needle,cursor);
 }
 pieces.push(value.slice(cursor));
 return <Text numberOfLines={3}>{pieces}</Text>;
}
