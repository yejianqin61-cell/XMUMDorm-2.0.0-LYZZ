import AboutProfileScreen from '../../src/screens/AboutProfileScreen';
import { router } from 'expo-router';
export default function AboutProfileRoute() { return <AboutProfileScreen onBack={() => router.back()} />; }
