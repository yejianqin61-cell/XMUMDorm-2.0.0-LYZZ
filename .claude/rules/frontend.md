# Frontend Development Rules

## Tech Stack
- **Framework**: React 18 + Vite
- **Routing**: React Router v6
- **State**: TanStack Query (server state) + React Context (UI state)
- **Styling**: CSS Modules (component-level) + some Tailwind utilities
- **HTTP**: `fetch()` in `frontend/src/api/`
- **PWA**: `frontend/public/sw.js`

## Naming Conventions
- **Pages**: `PascalCase.jsx` in `frontend/src/pages/`
- **Components**: `PascalCase.jsx` in `frontend/src/components/`
- **API files**: `camelCase.js` in `frontend/src/api/` (match backend module name)
- **Context**: `PascalCaseContext.jsx` in `frontend/src/context/`
- **CSS**: Same name as component: `ComponentName.css`

## Component Pattern

```jsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPosts, createPost } from '../../api/posts';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/Card';
import './PageName.css';

export default function PageName() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({});

  const { data, isLoading, error } = useQuery({
    queryKey: ['posts'],
    queryFn: () => fetchPosts(),
  });

  const mutation = useMutation({
    mutationFn: createPost,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
  });

  if (isLoading) return <SkeletonPost />;
  if (error) return <EmptyState message="加载失败" />;

  return (/* JSX */);
}
```

## State Management
- **Server state** (data from API) → TanStack Query (`useQuery` / `useMutation`)
- **UI state** (modals, toasts, sidebar) → React Context or local `useState`
- **Auth state** → `AuthContext` (user, isAdmin, isLoggedIn)
- **Never** put server data in useState when TanStack Query can handle it

## API Layer
- All API calls go through `frontend/src/api/<module>.js`
- Use `fetch()` with proper error handling
- Include JWT token from `AuthContext` in Authorization header
- Handle 401 → redirect to login

## Performance
- Use `React.lazy()` + `Suspense` for page-level code splitting
- Memoize expensive computations with `useMemo`
- Stable callbacks with `useCallback` when passed to child components
- Use `<Skeleton*>` components while loading (never blank screen)

## Accessibility
- All images must have `alt` text
- Form inputs must have labels
- Color contrast ratio ≥ 4.5:1
- Keyboard navigation support for critical flows
