import AboutThanksScreen from '../../src/screens/AboutThanksScreen';
import { router } from 'expo-router';
export default function AboutThanksRoute() { return <AboutThanksScreen onBack={() => router.back()} />; }
