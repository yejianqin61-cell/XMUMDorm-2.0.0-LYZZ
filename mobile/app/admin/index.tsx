import AdminScreen from '../../src/screens/AdminScreen';
import { router } from 'expo-router';
export default function AdminRoute() { return <AdminScreen onBack={() => router.back()} />; }
