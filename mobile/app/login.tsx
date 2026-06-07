import LoginScreen from '../src/screens/LoginScreen';
import { router } from 'expo-router';
export default function LoginRoute() { return <LoginScreen onGoRegister={() => router.push('/register')} />; }
