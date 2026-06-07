import DiaryScreen from '../src/screens/DiaryScreen';
import { router } from 'expo-router';
export default function DiaryRoute() { return <DiaryScreen onBack={() => router.back()} />; }
