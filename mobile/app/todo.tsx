import TodoScreen from '../src/screens/TodoScreen';
import { router } from 'expo-router';
export default function TodoRoute() { return <TodoScreen onBack={() => router.back()} />; }
