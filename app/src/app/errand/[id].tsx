import * as React from 'react';
import {useLocalSearchParams} from 'expo-router';
import {ErrandDetailScreen} from '@/features/errand/ErrandScreens';
export default function ErrandRoute():React.ReactElement {const {id}=useLocalSearchParams<{id:string|string[]}>();return <ErrandDetailScreen errandId={typeof id==='string'?id:''}/>;}
