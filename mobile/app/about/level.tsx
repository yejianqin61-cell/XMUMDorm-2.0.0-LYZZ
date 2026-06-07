import AboutLevelScreen from '../../src/screens/AboutLevelScreen';
import { router } from 'expo-router';
export default function AboutLevelRoute() { return <AboutLevelScreen onBack={() => router.back()} />; }
