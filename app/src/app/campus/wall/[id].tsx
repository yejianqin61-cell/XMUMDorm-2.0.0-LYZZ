import * as React from 'react';
import {useLocalSearchParams} from 'expo-router';
import {CampusDetailScreen} from '@/features/campus/CampusScreens';
export default function WallRoute():React.ReactElement {
 const {id}=useLocalSearchParams<{id:string|string[]}>();
 return <CampusDetailScreen postId={typeof id==='string'?id:''} kind="wall"/>;
}
