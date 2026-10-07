import * as React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { TodoFormScreen } from '@/features/todos/TodoFormScreen';
export default function TodoEditRoute(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TodoFormScreen id={typeof id === 'string' && /^\d+$/.test(id) ? Number(id) : NaN} />;
}
