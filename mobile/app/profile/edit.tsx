import ProfileEditScreen from '../../src/screens/ProfileEditScreen';
import { router } from 'expo-router';
export default function ProfileEditRoute() { return <ProfileEditScreen onBack={() => router.back()} />; }
