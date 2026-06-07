import AboutInfoScreen from '../../src/screens/AboutInfoScreen';
import { router } from 'expo-router';
export default function AboutInfoRoute() { return <AboutInfoScreen onBack={() => router.back()} />; }
