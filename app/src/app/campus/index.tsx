import * as React from 'react';
import {useLocalSearchParams} from 'expo-router';
import {CampusListScreen} from '@/features/campus/CampusScreens';
export default function CampusRoute():React.ReactElement {
 const {tab}=useLocalSearchParams<{tab:string|string[]}>();
 return <CampusListScreen initialTab={tab==='wall'?'wall':'confession'}/>;
}
