import * as React from 'react';
import {useLocalSearchParams} from 'expo-router';
import {MarketDetailScreen} from '@/features/marketplace/MarketScreens';
export default function MarketRoute():React.ReactElement {const {id,published}=useLocalSearchParams<{id:string|string[];published?:string}>();return <MarketDetailScreen published={published==='1'} itemId={typeof id==='string'?id:''}/>;}
