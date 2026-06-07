import ScheduleScreen from '../src/screens/ScheduleScreen';
import { router } from 'expo-router';
export default function ScheduleRoute() { return <ScheduleScreen onBack={() => router.back()} />; }
