---
title: "TanStack Query로 서버 상태 관리하기"
date: "2025-04-20"
description: "useQuery, useMutation의 기본 사용법과 캐싱 전략을 정리합니다."
tags: ["react", "tanstack-query", "server-state"]
---

## 왜 TanStack Query인가

클라이언트 상태와 서버 상태는 본질적으로 다릅니다.

- **클라이언트 상태**: UI 상태, 모달 open/close 등
- **서버 상태**: 데이터베이스에서 오는 데이터, 캐싱이 필요

Redux나 Zustand로 서버 상태를 관리하면 loading, error, refetch 등을 직접 구현해야 합니다.

## 기본 설정

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MyApp />
    </QueryClientProvider>
  );
}
```

## useQuery

```tsx
const { data, isLoading, error } = useQuery({
  queryKey: ['posts'],
  queryFn: () => fetch('/api/posts').then((r) => r.json()),
});
```

`queryKey`는 캐시 키입니다. 같은 key면 캐시를 재사용합니다.

## useMutation

```tsx
const mutation = useMutation({
  mutationFn: (newPost) => fetch('/api/posts', {
    method: 'POST',
    body: JSON.stringify(newPost),
  }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  },
});
```

## staleTime vs gcTime

| 옵션 | 설명 |
|---|---|
| staleTime | 데이터가 fresh로 간주되는 시간 (default: 0) |
| gcTime | 캐시에서 제거까지의 시간 (default: 5분) |

```tsx
useQuery({
  queryKey: ['user'],
  queryFn: fetchUser,
  staleTime: 60 * 1000, // 1분간 fresh
});
```
