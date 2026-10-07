import * as React from 'react';
import {useLocalSearchParams} from 'expo-router';
import {MarketDetailScreen} from '@/features/marketplace/MarketScreens';
export default function MarketRoute():React.ReactElement {const {id}=useLocalSearchParams<{id:string|string[]}>();return <MarketDetailScreen itemId={typeof id==='string'?id:''}/>;}
