import * as React from 'react';
import {useLocalSearchParams} from 'expo-router';
import {CampusDetailScreen} from '@/features/campus/CampusScreens';
export default function CampusRoute():React.ReactElement {
 const {id,published}=useLocalSearchParams<{id:string|string[];published?:string}>();
 return <CampusDetailScreen published={published==='1'} postId={typeof id==='string'?id:''}/>;
}
