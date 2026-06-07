import RegisterScreen from '../src/screens/RegisterScreen';
import { router } from 'expo-router';
export default function RegisterRoute() { return <RegisterScreen onBack={() => router.back()} />; }
