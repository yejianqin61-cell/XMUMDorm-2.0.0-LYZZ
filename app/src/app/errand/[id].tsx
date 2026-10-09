import * as React from 'react';
import {useLocalSearchParams} from 'expo-router';
import {ErrandDetailScreen} from '@/features/errand/ErrandScreens';
export default function ErrandRoute():React.ReactElement {const {id,published}=useLocalSearchParams<{id:string|string[];published?:string}>();return <ErrandDetailScreen published={published==='1'} errandId={typeof id==='string'?id:''}/>;}
