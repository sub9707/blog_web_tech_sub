---
title: "[React] TanStack Query에서 살아남기"
date: "2026-11-17"
description: "Tanstack query 내용 정리"
tags: ["react", "nextjs", "tanstack-query", "react-query", "server-state", "ssr", "hydration"]
thumbnail: "/assets/thumbnails/react/tanstack-query.webp"
---

React에서 API를 연동할 때는 보통 effect 안에서 fetch를 호출하고, useState로 상태를 각각 관리하는 코드를 작성한다.

규모가 작을 때는 문제가 없지만, 페이지가 늘어나거나 프로젝트 규모가 커지면 같은 API를 여러 곳에서 호출하게 되고 데이터를 언제 다시 불러올지 정하는 코드가 곳곳에 흩어진다.

TanStack Query(구 React Query, 다른 프레임워크에 확장하기 위해 React-query라는 이름을 탈피했다고...)는 이를 "서버에서 가져온 데이터는 따로 관리하겠다"는 관점에서 풀어낸 라이브러리다.

![TanStack Query 공식 문서의 지원 프레임워크 목록](/assets/React/tanstack-query/tanstack-query-framework-support.webp)


이번 글에서 TanStack Query에 대해 제대로 정리해보고자 한다.

> 이 글은 TanStack Query v5 기준이다.

<br/>

## 서버 상태

앱에서 쓰는 상태는 크게 두 종류로 나눌 수 있다.

- 클라이언트 상태: 모달 열림 여부, 입력 중인 폼 값처럼 브라우저 안에서만 필요한 값
- 서버 상태: 게시글 목록, 유저 정보처럼 실제 원본은 서버 DB에 있고, 클라이언트는 그 복사본을 잠깐 들고 있는 값

클라이언트 상태는 앱의 코드가 `setState` 등으로 변경하지 않는 한 바뀌지 않는 상태다. 반면 서버 상태는 앱 바깥에서도 변경된다. 다른 사용자의 요청, 같은 사용자의 다른 탭, 서버의 작업 등이 서버 DB의 원본을 수정할 수 있고, 클라이언트는 이 변경을 알지 못한다. 즉, 클라이언트가 가진 서버 데이터의 복사본은 언제든 옛날의 값이라 할 수 있다.

따라서 서버 상태를 다룰 때는 가져온 데이터를 언제까지 그대로 사용하고 언제 서버에 다시 요청할지를 결정해야 한다.

Redux나 Zustand 같은 상태 관리 도구는 이 결정을 대신하지 않는다. 값을 저장할 저장소를 제공할 뿐이고, 다시 요청하는 시점과 방식은 코드로 따로 구현해야 한다.

TanStack Query는 이 문제들을 라이브러리 차원에서 처리하는 서버 상태 전용 도구다.

<bookmark url="https://tanstack.com/query/latest/docs/framework/react/overview"></bookmark>

<br/>

## useEffect로 불러올 때의 문제

TanStack Query 없이 데이터를 불러오는 예제를 보자.

```tsx
function PostList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let ignore = false;

    fetch('/api/posts')
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) setPosts(data);
      })
      .catch((err) => {
        if (!ignore) setError(err);
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorView />;
  return <ul>{posts.map((post) => <PostItem key={post.id} post={post} />)}</ul>;
}
```

API 하나를 호출하기 위해 필요한 코드가 길다. 그럼에도 이 코드에는 빠진 부분이 있다.

- 다른 컴포넌트에서 같은 `/api/posts`를 사용하면 요청이 중복으로 발생한다
- 다른 페이지로 이동했다가 돌아오면 처음부터 다시 로딩 스피너가 표시된다
- 탭을 오래 열어두면 오래된 데이터가 그대로 남는다(브라우저 기본 설정)
- 실패 시를 위한 재시도 로직이 빠졌다.
- 게시글을 새로 작성해도 목록이 바뀐지 알 수 없다.

<br/>

## 기본 사용법

### 설치

```bash
npm i @tanstack/react-query
npm i -D @tanstack/react-query-devtools
```

### QueryClient와 Provider

TanStack Query의 모든 데이터는 `QueryClient`라는 객체 안의 캐시에 저장된다. 앱 최상단에서 이 객체를 만들고 Provider로 내려줘야한다.

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

`QueryClient`를 컴포넌트 바깥에서 생성했다는 점에 주목할 필요가 있다. Next.js에서는 이 부분이 달라진다.

### useQuery

아까 effect에 작성한 코드를 `useQuery`로 바꿔보자.

```tsx
import { useQuery } from '@tanstack/react-query';

async function fetchPosts(): Promise<Post[]> {
  const res = await fetch('/api/posts');
  if (!res.ok) throw new Error('게시글을 불러오지 못했습니다');
  return res.json();
}

function PostList() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
  });

  if (isPending) return <Spinner />;
  if (isError) return <ErrorView />;
  return <ul>{data.map((post) => <PostItem key={post.id} post={post} />)}</ul>;
}
```

필요한 옵션은 두 가지가 있다.

- `queryKey`: 이 데이터를 캐시에 저장할 때 쓰는 이름
- `queryFn`: 데이터를 가져오는 함수. Promise를 반환하면 된다.

`fetch`는 404, 500 응답에서도 reject 되지 않기 때문에 `res.ok`를 직접 확인해서 에러를 던져야 한다. 에러를 던져야 실패로 인식한다. 재시도 로직은 TanStack Query에 내장되어 있어 `queryFn`이 에러를 던지면 같은 `queryFn`을 자동으로 다시 호출하고(기본 3회), 모두 실패하면 `isError`가 true가 된다.

이제 다른 컴포넌트에서 `queryKey: ['posts']`로 같은 쿼리를 사용해도 요청은 한 번만 발생하고, 두 컴포넌트는 같은 캐시 데이터를 참조하게 된다.

<br/>

## 쿼리 상태

`useQuery`가 반환하는 상태는 두 기준으로 나뉜다.

**status**: 데이터를 받은 상태인가

- `pending`: 아직 데이터 안받음
- `success`: 데이터 받음
- `error`: 에러 발생

**fetchStatus**: 지금 요청 중인가

- `fetching`: 요청 전송 중
- `paused`: 요청 대기
- `idle`: 진행 중인 요청 없음

두 기준을 나눈 이유는 "데이터는 있으나 뒤에서 다시 불러오는 중"인 상황이 흔하기 때문이다. 이때는 `status: success`, `fetchStatus: fetching`이 된다.

자주 쓰이는 boolean 값들을 보자

| 값 | 의미 |
| --- | --- |
| `isPending` | 캐시에 데이터가 아직 없음 |
| `isLoading` | 데이터도 없고 첫 요청 중 (`isPending && isFetching`) |
| `isFetching` | 데이터 유무와 상관없이 요청 중 |
| `isSuccess` | 데이터 있음 |
| `isError` | 에러 발생 |

스피너는 `isPending`으로, 상단의 작은 "갱신 중" 표시는 `isFetching`으로 처리한다.

요청 중에 스피너를 보여주는 것이므로 `isFetching`이라 생각했다. 그러나 `isFetching`은 이미 데이터가 있는 상태에서 다시 요청할 때도 true가 된다. TanStack Query는 창 포커스, 컴포넌트 재마운트, `invalidateQueries` 호출 시점에 캐시를 유지한 채 다시 요청하는데, 이때 스피너를 표시하면 화면에 있던 데이터가 스피너로 바뀌었다가 다시 나타난다. 캐시를 먼저 보여주고 뒤에서 갱신하는 UX 장점이 사라지는 것이다. 사용자들이 글을 보고 있다가 스피너로 바뀌고 그걸 보고 있어야한다면 어떻겠는가..

따라서 표시할 데이터가 없을 때만 전체 스피너를 보여주고(`isPending`), 데이터가 있는 상태의 재요청은 데이터를 유지한 채 작은 UI로만 알리는(`isFetching`) 방식이 적절하다.

단, 조건에 따라 요청을 보내지 않는 쿼리에서는 `isPending` 대신 `isLoading`을 사용해야 한다. 검색어를 입력해야만 요청하는 쿼리를 예로 들면 다음과 같다.

```tsx
const { data, isPending, isLoading } = useQuery({
  queryKey: ['search', keyword],
  queryFn: () => searchPosts(keyword),
  enabled: keyword.length > 0,
});
```

검색어를 입력하기 전에는 `enabled`가 false라서 요청을 보내지 않는다. 하지만 받은 데이터도 없기 때문에 `isPending`은 true다. 이때 `isPending`으로 스피너를 표시하면 사용자가 검색어를 입력하기 전까지 스피너가 계속 표시된다.

`isLoading`은 `isPending && isFetching`, 즉 데이터가 없고 실제로 요청 중일 때만 true다.

| 시점 | isPending | isFetching | isLoading |
| --- | --- | --- | --- |
| 입력 전 (요청 없음) | true | false | false |
| 입력 후 요청 중 | true | true | true |
| 결과 도착 | false | false | false |

따라서 `isLoading`으로 스피너를 표시하면 입력 전에는 스피너가 표시되지 않고, 실제 요청이 진행되는 동안에만 표시된다.

> v4까지는 `isLoading`이 지금의 `isPending` 역할이었다. v5에서 이름이 바뀌었으므로 이전 버전 기준의 자료를 참고할 때 주의해야 한다.

<br/>

## staleTime과 gcTime

TanStack Query에서 가장 혼동하기 쉬우면서도 가장 중요한 개념이다.

### staleTime

데이터를 받은 뒤 다시 요청하지 않고 캐시만 사용하는 기간이다. 이 기간 안의 데이터는 fresh, 기간이 지난 데이터는 stale 상태가 된다.

- fresh: 최신 데이터로 간주하고 요청 없이 캐시를 사용한다
- stale: 캐시를 먼저 표시하고, 정해진 시점에 다시 요청해 갱신한다

**기본값은 0이다.** 즉, 데이터를 받는 즉시 stale 상태가 된다.

### gcTime

쿼리를 쓰는 컴포넌트가 하나도 없을 때(inactive), 캐시를 메모리에 얼마나 남겨둘지 정하는 시간이다. 이 시간이 지나면 캐시가 삭제된다.

**기본값은 5분이다.**

> v4까지는 `cacheTime`이라는 이름이었지만 "캐시가 유지되는 시간"으로 오해하는 사람이 많아서 v5에서 가비지 컬렉션 시간이라는 뜻의 `gcTime`으로 바뀌었다. 캐시가 유지되는 시간이 아닌, 미사용 캐시를 삭제할 때까지 기다릴 시간이다.

### 차이점

- `staleTime`:  서버에서 다시 받아와야 할까?
- `gcTime`: 안쓰는 데이터 이제 버려도 될까?

예를 들어 `staleTime: 1분`, `gcTime: 5분`인 게시글 목록을 예로 들어보자

```
0초      목록 페이지 진입, 요청 → 캐시 저장 (fresh)
30초     상세 페이지로 이동 → 목록 쿼리 inactive
40초     목록 페이지로 복귀 → fresh라서 요청 없이 캐시 바로 표시
1분      stale로 전환
2분      상세 페이지로 이동 → inactive
3분      목록 페이지로 복귀 → 캐시를 먼저 보여주고 뒤에서 재요청
7분 이후  inactive 상태로 5분 지남 → 캐시 삭제
이후   다시 진입하면 캐시가 없으므로 스피너부터 표시
```
![쿼리 캐시 생명주기](/assets/React/tanstack-query/tanstack-query-cache-lifecycle.webp)

### 자동으로 다시 불러오는 시점

stale, 상해버린 상태의 쿼리는 아래 상황에서 자동으로 다시 요청된다.

- 해당 쿼리를 쓰는 컴포넌트가 새로 마운트될 때 (`refetchOnMount`)
- 브라우저 창에 다시 포커스가 갈 때 (`refetchOnWindowFocus`)
- 네트워크가 다시 연결될 때 (`refetchOnReconnect`)

다른 창에 다녀오면 요청이 다시 발생하는데, `staleTime`이 0이기 때문에 생기는 정상 동작이다.

자주 바뀌지 않는 데이터라면 기본값을 그대로 쓰기보다 아래처럼 `staleTime`을 늘려 설정하는 것이 적절하다.

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
    },
  },
});
```

그 외 기본 동작은 다음과 같다.

- 실패하면 3번까지 재시도
- 새로 받은 데이터가 이전과 같은 부분은 이전 객체를 그대로 재사용. 바뀌지 않은 부분은 참조가 유지되고 불필요한 리렌더링이 줄어든다

<bookmark url="https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults"></bookmark>

<br/>

## 쿼리 키

쿼리 키는 캐시에서 데이터를 찾는 주소에 해당한다. 배열 형태로 전달하고, 문자열, 숫자, 객체를 넣을 수 있다.

```tsx
useQuery({ queryKey: ['posts'], queryFn: fetchPosts });
useQuery({ queryKey: ['posts', postId], queryFn: () => fetchPost(postId) });
useQuery({
  queryKey: ['posts', { page, sort }],
  queryFn: () => fetchPosts({ page, sort }),
});
```

### 키에는 들어갈 값

`queryFn` 안에서 쓰이는 변수는 이 키에 들어가야 한다.

```tsx
// 잘못된 예
useQuery({ queryKey: ['posts'], queryFn: () => fetchPosts({ page }) });

// 올바른 예
useQuery({ queryKey: ['posts', page], queryFn: () => fetchPosts({ page }) });
```

첫 번째 예시는 `page`가 바뀌어도 키가 같기 때문에 1페이지 캐시를 계속 표시한다. 키가 바뀌어야 새 쿼리로 인식하고 다시 요청한다.

effect과 메모이제이션 의존 배열과 용도가 비슷하다.

참고로 순서는 상관없다. `{ page, sort }`와 `{ sort, page }`는 같은 키로 본다. 반면 배열의 순서는 다르게 본다.

### 계층적 키

키를 앞에서부터 넓은 범위, 뒤로 갈수록 좁은 범위로 좁히는 형식으로 짜두면 나중에 캐시를 한꺼번에 갱신하기 편하다.

```
['posts']                       게시글 전체
['posts', 'list']               게시글 목록들
['posts', 'list', { page: 1 }]  1페이지 목록
['posts', 'detail', 3]          3번 게시글 상세
```

`['posts']`로 무효화(강제 stale)하면 이 아래 키가 전부 갱신되고, `['posts', 'list']`로 무효화하면 목록만 갱신된다. 앞부분이 일치하는 쿼리를 모두 대상으로 잡기 때문이다.

### queryOptions로 묶음

키와 함수를 컴포넌트마다 따로 작성하면 오타가 발생하기 쉽다. v5의 `queryOptions`로 한곳에 모아두면 관리가 쉬워지고 타입 추론도 함께 적용된다.

```ts
import { queryOptions } from '@tanstack/react-query';

export const postQueries = {
  all: () => ['posts'] as const,
  lists: () => [...postQueries.all(), 'list'] as const,
  list: (page: number) =>
    queryOptions({
      queryKey: [...postQueries.lists(), { page }],
      queryFn: () => fetchPosts({ page }),
    }),
  detail: (id: number) =>
    queryOptions({
      queryKey: [...postQueries.all(), 'detail', id],
      queryFn: () => fetchPost(id),
      staleTime: 5 * 60 * 1000,
    }),
};
```

```tsx
// 상세 글 호출
const { data } = useQuery(postQueries.detail(id));
```

이렇게 만들어 둔 옵션은 `useQuery`, `prefetchQuery`, `getQueryData` 어디서든 그대로 쓸 수 있다.

<bookmark url="https://tkdodo.eu/blog/effective-react-query-keys"></bookmark>

<br/>

## 자주 쓰는 옵션

### enabled

특정 조건을 만족할 때만 요청을 보내도록 제한한다. 앞선 쿼리의 결과가 있어야 다음 쿼리를 보낼 수 있는 경우에 주로 사용한다.

```tsx
const { data: user } = useQuery({
  queryKey: ['user', email],
  queryFn: () => fetchUser(email),
});

const { data: projects } = useQuery({
  queryKey: ['projects', user?.id],
  queryFn: () => fetchProjects(user!.id),
  // user의 id 불린 변환으로 판단. Boolean(user?.id)와 동일
  enabled: !!user?.id,
});
```

### select

캐시에서 데이터를 꺼낼 때, 컴포넌트에 넘기기 직전에 원하는 모양으로 바꿔주는 옵션이다.

이름에 걸맞게 SQL의 SELECT와 기능이 유사하다.

```tsx
const { data: titles } = useQuery({
  ...postQueries.list(1),
  select: (posts) => posts.map((post) => post.title),
});
```

캐시에는 원본이 남아있기 때문에 다른 컴포넌트에서는 다른 형태로 가공해 사용할 수 있다.

### placeholderData

input의 placeholder나 스켈레톤 UI처럼 진짜 값이 오기 전까지 임시로 보여주는 값이다. 다만 안내 문구나 회색 박스가 아니라 실제 데이터와 같은 형태의 데이터(keepPreviousData 사용 시 이전 데이터 활용)를 `data`에 넣는다는 점이 다르다. 이 값은 캐시에 저장되지 않고, 실제 데이터가 도착하면 교체된다.

대표적인 용도는 페이지 전환이다. 새 데이터가 도착하기 전까지 이전 페이지 데이터를 유지하며, 이 옵션이 없으면 페이지가 바뀔 때마다 키가 바뀌어 스피너가 다시 표시된다.

```tsx
import { keepPreviousData, useQuery } from '@tanstack/react-query';

const { data, isPlaceholderData } = useQuery({
  ...postQueries.list(page),
  placeholderData: keepPreviousData,
});
```

`isPlaceholderData`가 true이면 현재 표시 중인 값이 이전 페이지 데이터라는 의미다. 이 값으로 다음 버튼을 일시적으로 비활성화할 수 있다.
<br/>

## useMutation

조회는 `useQuery`, 생성, 수정, 삭제는 `useMutation`을 사용한다.

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

function NewPostForm() {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: (newPost: NewPost) =>
      fetch('/api/posts', {
        method: 'POST',
        body: JSON.stringify(newPost),
      }).then((res) => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postQueries.lists() });
    },
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutate({ title: '새 글' }); }}>
      <button disabled={isPending}>작성</button>
    </form>
  );
}
```

useMutation에서 POST 요청을 통해 새로운 게시글을 생성한다.

이 때, mutate와 isPending으로 각각 등록과 버튼 비활성화 기능을 구현한다.

`useQuery`와의 차이를 보자

- 컴포넌트가 마운트돼도 자동으로 실행되지 않는다. `mutate`를 직접 호출해야 한다
- 결과를 캐시에 저장하지 않는다
- 기본적으로 재시도하지 않는다

### invalidateQueries

Mutation이 성공한 뒤 관련된 목록을 갱신하는 가장 기본적인 방법이다.

`invalidateQueries`를 호출하면 일어나는 일은 두 가지다.

1. 해당 키로 시작하는 쿼리를 모두 stale로 표시한다
2. 그중 지금 화면에서 쓰고 있는 쿼리는 바로 다시 요청한다

화면에 없는 쿼리는 stale 표시만 해두고, 나중에 그 화면에 진입할 때 요청한다.

예를 들어 캐시에 게시글 목록 1~10페이지가 있고 현재 3페이지를 보고 있다면, `['posts', 'list']`로 무효화해도 즉시 요청되는 것은 3페이지 하나뿐이다. 나머지 9개 페이지는 사용자가 해당 페이지로 이동할 때 요청된다. 따라서 무효화 범위를 넓게 잡아도 캐시에 있는 쿼리 수만큼 요청이 동시에 발생하지 않는다.

### setQueryData

수정 API가 변경된 데이터를 응답으로 반환한다면, 재요청 없이 캐시를 직접 갱신할 수 있다.

이런 상황을 위해 사용하는 것이 `setQueryData`이다.

```tsx
useMutation({
  mutationFn: updatePost,
  onSuccess: (updatedPost) => {
    queryClient.setQueryData(
      postQueries.detail(updatedPost.id).queryKey,
      updatedPost,
    );
  },
});
```

다만 이 데이터가 포함된 목록 캐시까지 직접 갱신하기는 번거롭기에, 일반적으로 상세는 `setQueryData`, 목록은 `invalidateQueries`로 함께 처리한다.

<br/>

## 낙관적 업데이트

좋아요 버튼처럼 서버 응답을 기다리지 않고 화면을 먼저 갱신해야 하는 경우가 있다. 서버 응답이 느린 경우, 사용자가 좋아요를 눌렀음에도 스피너가 돌거나 바뀌지않는다면 답답함을 느낄 것이다. 요청이 성공할 것으로 가정하고 브라우저에 결과를 먼저 뿌리는 방식을 낙관적 업데이트라고 한다.

React 19에는 이를 위한 `useOptimistic` 훅이 추가되었고, TanStack Query는 캐시를 직접 변경하는 방식으로 같은 기능을 구현한다. 두 방식은 임시 값이 반영되는 범위가 다르다.

### React 19의 낙관적 업데이트 

```tsx
function LikeButton({ liked }: { liked: boolean }) {
  const [optimisticLiked, setOptimisticLiked] = useOptimistic(liked);

  const handleClick = () => {
    startTransition(async () => {
      setOptimisticLiked(!optimisticLiked);
      await toggleLikeAction();
    });
  };

  return <button onClick={handleClick}>{optimisticLiked ? '좋아요 취소' : '좋아요'}</button>;
}
```

- 임시 값은 이 컴포넌트 안에서만 보인다
- 비동기 작업(transition)이 끝나면 임시 값은 자동으로 사라지고 원래 값(`liked`)으로 돌아간다. 실패 시 되돌리는 코드가 필요 없다
- 대신 성공했을 때 원래 값을 갱신하는 일은 따로 해야 한다. Server Action에서 `revalidatePath`를 호출하거나 부모의 state를 바꾸지 않으면, 요청이 성공해도 화면이 이전 값으로 돌아간다

### TanStack Query의 낙관적 업데이트

```tsx
useMutation({
  mutationFn: toggleLike,
  onMutate: async (postId) => {
    const queryKey = postQueries.detail(postId).queryKey;
    await queryClient.cancelQueries({ queryKey });
    const previous = queryClient.getQueryData(queryKey);
    // 낙관적 업데이트: 응답 전에 캐시를 먼저 변경
    queryClient.setQueryData(queryKey, (old) => old && { ...old, liked: !old.liked });
    return { previous, queryKey };
  },
  onError: (_err, _postId, context) => {
    // 실패 시 저장해둔 이전 값으로 되돌림
    queryClient.setQueryData(context!.queryKey, context!.previous);
  },
  // 성공, 실패와 관계없이 서버 값으로 다시 맞춤
  onSettled: (_data, _err, postId) =>
    queryClient.invalidateQueries({ queryKey: postQueries.detail(postId).queryKey }),
});
```

- 캐시 자체를 변경하므로 같은 쿼리를 사용하는 모든 컴포넌트에 임시 값이 반영된다
- 실패 시 되돌리는 코드(`onError`)와, 진행 중인 재요청이 임시 값을 덮어쓰지 않도록 취소하는 코드(`cancelQueries`)를 직접 작성해야 한다
- 성공 여부와 관계없이 `onSettled`에서 무효화해 서버 값과 맞춘다

### 비교

| | useOptimistic | TanStack Query 캐시 변경 |
| --- | --- | --- |
| 임시 값이 보이는 범위 | 해당 컴포넌트 | 같은 쿼리를 쓰는 모든 컴포넌트 |
| 실패 시 되돌리기 | 자동 | 직접 작성 |
| 성공 후 실제 값 반영 | 직접 처리 (revalidate, state 변경) | `invalidateQueries`로 처리 |
| 잘 맞는 구조 | Server Action, form action | TanStack Query로 데이터를 관리하는 화면 |

### 선택 기준

- 변경 결과가 버튼 하나, 항목 하나와 같이 한 곳에서만 보여야한다면 `useOptimistic`이 간단하다
- 같은 데이터가 목록, 상세, 헤더 개수처럼 여러 곳에 표시되면 TanStack Query의 캐시 변경이 적절하다. `useOptimistic`으로는 다른 컴포넌트의 화면까지 바꿀 수 없다
- 데이터를 TanStack Query로 관리하지 않고 Server Action과 `revalidatePath`만 사용하는 Next.js 화면이라면 `useOptimistic`이 자연스럽다
- 실패해도 큰 문제가 없는 동작(좋아요, 북마크)에 주로 사용하고, 결제나 주문처럼 결과가 확실해야 하는 UI에는 낙관적 업데이트를 사용하지 않는다

<bookmark url="https://react.dev/reference/react/useOptimistic"></bookmark>

<bookmark url="https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates"></bookmark>

<br/>

## 무한 스크롤

무한 스크롤을 구현할 땐 `useInfiniteQuery`를 통해 구현할 수 있다. 여러 페이지를 하나의 캐시에 `pages` 배열로 이어서 저장한다.

```tsx
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: ['posts', 'infinite'],
  queryFn: ({ pageParam }) => fetchPosts({ cursor: pageParam }),
  initialPageParam: 0,
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
});

const posts = data?.pages.flatMap((page) => page.items) ?? [];
```

- `initialPageParam`: 첫 페이지 요청에 사용할 값
- `getNextPageParam`: 마지막으로 받은 페이지를 기준으로 다음 요청 값을 결정한다. `undefined`를 반환하면 `hasNextPage`가 false가 된다

스크롤 감지는 `IntersectionObserver`로 목록 끝의 요소가 화면(뷰포트)에 들어올 때 `fetchNextPage`를 호출하는 방식으로 구현하면 된다.

<br/>

## React와 Next.js에서의 차이

지금까지의 내용은 브라우저에서만 실행되는 일반적인 React 앱 기준이었다. Next.js App Router에서는 같은 라이브러리를 사용하더라도 설정과 사용 방식이 달라진다.

서버에서 렌더링하는 서버 컴포넌트와, 클라이언트에서 서버 함수를 직접 호출해 데이터를 변경하는 서버 액션은 React 19에 포함된 React의 기능이다. 다만 React는 동작 규칙과 API만 정의하고, 이를 실제로 실행하려면 서버, 번들러, 라우터를 갖춘 Next.js 같은 프레임워크가 필요하다. Vite 등으로 만든 React 앱은 React 19를 사용하더라도 브라우저에서만 동작하는 SPA이며, 여기선 이러한 SPA와 Next.js App Router를 살짝 비교해보자.

| | React SPA + TanStack Query | Next.js App Router + TanStack Query |
| --- | --- | --- |
| 코드가 실행되는 곳 | 브라우저 | 서버와 브라우저|
| 데이터 초기 로드 | 브라우저에서 `useQuery` | 서버 컴포넌트에서 prefetch |
| QueryClient | 모듈 최상단에 하나 | 서버는 요청마다 새로, 브라우저는 하나 |
| Provider | 최상단에서 감싸면 됨 | `'use client'` 파일로 분리 |
| 첫 화면 | 빈 화면 → 스피너 → 데이터 | 데이터 채워진 HTML |
| 서버 데이터 전달 | 필요 없음 | `dehydrate` → `HydrationBoundary` |
| staleTime | 기본값 0도 무방 | 0이면 수신 직후 재요청하므로 늘려야 함 |

<br/>

### SPA에서의 흐름

일반적인 React 앱에서는 모든 과정이 브라우저 안에서 진행된다.

```
HTML 다운로드
      ↓
JS 번들 다운로드, 실행
      ↓
컴포넌트 렌더링 → useQuery 실행
      ↓
API 요청 → 스피너 표시
      ↓
응답 도착 → 데이터 표시
```

브라우저 하나에는 사용자가 한 명뿐이다. 따라서 `QueryClient`를 모듈 최상단에 하나 생성해 앱이 종료될 때까지 사용해도 문제가 없다.

<br/>

### Next.js에서의 흐름

Next.js는 이 과정의 일부를 서버에서 처리한다.

```
서버: 서버 컴포넌트에서 데이터 prefetch
      ↓
서버: 데이터를 채운 HTML 생성 + 캐시 데이터를 직렬화해서 같이 전송
      ↓
브라우저: HTML 바로 표시
      ↓
브라우저: JS 실행, 받은 캐시 데이터를 QueryClient에 넣음 (hydrate)
      ↓
브라우저: useQuery가 캐시에서 바로 데이터를 꺼냄 → 스피너 없음
```

![SPA와 Next.js의 데이터 로딩 흐름 비교](/assets/React/tanstack-query/tanstack-query-spa-vs-nextjs.webp)

이 흐름을 구현하려면 SPA에는 없던 처리가 추가로 필요하다.

<br/>

### 서버에서 QueryClient를 활용할 때

SPA처럼 모듈 최상단에 `QueryClient`를 생성하면, Next.js 서버에서는 이 인스턴스가 서버가 실행되는 동안 계속 유지된다.

그러면 A 사용자의 요청에서 prefetch한 데이터가 캐시에 남아있다가, B 사용자의 요청에서 그대로 보일 수 있다. 공용 데이터라면 문제가 없지만, 개인 데이터라면 다른 사용자에게 노출될 수 있다.

따라서 서버에서는 요청마다 새 `QueryClient`를 생성하고, 브라우저에서는 SPA와 같이 하나의 인스턴스를 재사용해야한다.

```ts
// get-query-client.ts
import { QueryClient, isServer } from '@tanstack/react-query';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
// 서버 환경이면 매번 새로 생성
  if (isServer) {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
```
- 브라우저 환경이면 한 번만 생성하고 재사용한다. 처리하지않으면 리렌더링될 때마다 캐시가 초기화된다

<br/>

### Provider를 클라이언트 컴포넌트로 분리해야 한다

App Router의 컴포넌트는 기본적으로 서버 컴포넌트다. 서버 컴포넌트에서는 Context를 생성할 수 없고, Hook도 사용할 수 없다.

`QueryClientProvider`는 내부적으로 React Context를 사용하기 때문에 클라이언트 컴포넌트에 있어야 한다.

```tsx
// app/providers.tsx
'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { getQueryClient } from '@/lib/get-query-client';

export default function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}
```

Provider가 클라이언트 컴포넌트여도 `children`으로 넘긴 서버 컴포넌트는 그대로 서버 컴포넌트로 남는다. 레이아웃 전체가 클라이언트 컴포넌트로 바뀌지는 않는다.

<br/>

### prefetch와 HydrationBoundary

아래 예시는 tanstack query를 활용하는 NextJS앱의 서버에서 데이터를 미리 가져와 클라이언트 캐시에 전달하는 과정이다.

```tsx
// app/posts/page.tsx (서버 컴포넌트)
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { postQueries } from '@/queries/posts';
import PostList from '@/app/posts/post-list';

export default async function PostsPage() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery(postQueries.list(1));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PostList />
    </HydrationBoundary>
  );
}
```

```tsx
// app/posts/post-list.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { postQueries } from '@/queries/posts';

export default function PostList() {
  const { data } = useQuery(postQueries.list(1));

  return <ul>{data?.map((post) => <li key={post.id}>{post.title}</li>)}</ul>;
}
```

순서로 구조를 살펴보자

1. 서버 컴포넌트에서 `prefetchQuery`로 데이터를 가져와 서버용 QueryClient에 저장한다
2. `dehydrate`로 캐시 내용을 직렬화 가능한 형태로 추출한다
3. `HydrationBoundary`가 이 값을 props로 받아 클라이언트로 전달한다
4. 브라우저에서 `HydrationBoundary`가 전달받은 데이터를 브라우저용 QueryClient 캐시에 저장한다
5. `PostList`의 `useQuery`는 같은 키의 캐시가 이미 존재하므로(4번) 요청 없이 바로 데이터를 사용한다

여기서 `dehydrate`를 하는 이유는 서버에서 클라이언트로 넘어가는 값은 직렬화(객체 -> 바이트 데이터 전송)가 가능해야 하기 때문이다. QueryClient 객체는 함수와 내부 상태를 포함하고 있어 그대로 전달할 수 없다. 그래서 캐시의 데이터와 상태만 추출해 전달하고, 브라우저에서 다시 채워 넣는다(hydrate).

`queryFn`이 서버와 브라우저 양쪽에서 실행될 수 있다는 점도 주의해야 한다. 서버에서는 `/api/posts` 같은 상대 경로가 동작하지 않으므로 전체 URL을 사용하거나, 서버 전용 함수와 클라이언트 요청 함수를 분리해야 한다.

<bookmark url="https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr"></bookmark>

<br/>

### staleTime 설정

서버에서 prefetch한 데이터는 브라우저에 도착한 시점에 이미 수백 ms가 지난 상태다.

`staleTime`이 기본값 0이면 브라우저 캐시에 저장되는 즉시 stale 상태가 되고, `useQuery`가 마운트되면서 같은 요청을 다시 보낸다. 결과적으로 서버에서 prefetch한 의미가 사라진다.

그래서 SSR을 쓸 때는 위의 `makeQueryClient`처럼 기본 `staleTime`을 0보다 크게 설정하는 것이 좋다.

SPA에서는 이 문제가 발생하지 않는다. 데이터를 가져오는 곳과 사용하는 곳이 같은 브라우저기 때문에 수신 직후 재요청할 이유가 없다.

<br/>

## Next.js에서 꼭 써야 할까

Next.js에서도 TanStack Query는 사용한다. 다만 SPA처럼 모든 데이터를 맡기지 않고, 필요한 화면에만 사용하는 방향으로 범위가 줄어든다.

App Router에서는 서버 컴포넌트가 `fetch`로 데이터를 가져와 바로 렌더링한다. 화면에 한 번 표시하면 되는 데이터는 로딩 상태, 캐시, 재요청을 클라이언트에서 관리할 필요가 없다. 데이터 변경도 서버 액션과 `revalidatePath`로 처리할 수 있으므로, 단순한 화면은 TanStack Query 없이도 충분하다.

다만 화면이 표시된 이후 브라우저에서 데이터가 계속 바뀌는 경우에는 서버 컴포넌트만으로 부족하다.

- 무한 스크롤, 필터를 바꿀 때마다 다시 불러오는 목록
- 일정 간격으로 다시 불러오는 대시보드, 알림
- 여러 클라이언트 컴포넌트가 같은 데이터를 공유하고 함께 갱신되어야 하는 화면
- 외부 API를 클라이언트에서 직접 호출하는 경우

**일반적인 구성**

```
첫 화면 데이터  → 서버 컴포넌트에서 조회 (필요하면 prefetch 후 hydrate)
이후 상호작용  → 클라이언트에서 TanStack Query
```

서버 컴포넌트와 TanStack Query 중 하나를 선택하는 것이 아니라, 첫 화면은 서버 컴포넌트가, 이후 상호작용은 TanStack Query가 담당하도록 나누어 사용한다.

### 같은 데이터를 두 곳에서 렌더링하지 않기

주의해야 할 패턴이 있다.

```tsx
// 서버 컴포넌트
export default async function PostsPage() {
  const queryClient = getQueryClient();
  const posts = await queryClient.fetchQuery(postQueries.list(1));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <p>총 {posts.length}개</p>
      <PostList />
    </HydrationBoundary>
  );
}
```

서버 컴포넌트에서 `posts.length`를 직접 렌더링하고, 클라이언트 컴포넌트 `PostList`에서도 같은 데이터를 `useQuery`로 사용하고 있다.

이후 클라이언트에서 목록을 다시 불러오면 `PostList`는 새 데이터로 갱신되지만, 서버 컴포넌트가 렌더링한 "총 N개"는 그대로 유지된다. 서버 컴포넌트는 브라우저 캐시가 변경되어도 다시 렌더링되지 않기 때문이다.

TanStack Query로 관리하는 데이터는 클라이언트 컴포넌트에서만 렌더링하고, 서버 컴포넌트는 prefetch만 담당하도록 구성하는 것이 안전하다.

<br/>

## Next.js fetch 캐시와의 관계

Next.js의 `fetch`에도 자체 캐시가 있지만, 두 캐시는 저장 위치와 역할이 다르다.

- Next.js `fetch` 캐시: 서버에 저장된다. 여러 사용자 요청 사이에서 같은 응답을 재사용한다
- TanStack Query 캐시: 브라우저 메모리에 저장된다. 한 사용자의 화면 안에서 데이터를 재사용하고 갱신한다

서버의 QueryClient는 요청마다 생성되고 폐기되기 때문에 서버에서 TanStack Query 캐시가 재사용되지 않는다. 즉, 서버 측 재사용은 Next.js가, 브라우저 측 재사용은 TanStack Query가 담당한다.

<br/>

## axios와의 차이

axios와 TanStack Query는 비교 대상으로 자주 언급되지만, 실제로는 담당하는 영역이 다르다.

- axios: 요청을 보내고 응답을 받는 HTTP 클라이언트. `fetch`와 같은 영역이다
- TanStack Query: 받은 데이터를 언제까지 사용하고 언제 다시 요청할지 관리하는 서버 상태 관리 도구

TanStack Query는 요청 방식에 관여하지 않는다. `queryFn`이 Promise를 반환하기만 하면 되므로 내부에서 `fetch`, axios, GraphQL 클라이언트 중 무엇을 사용해도 된다. 따라서 둘은 대체 관계가 아니라 함께 사용하는 관계다.


<br/>

### 함께 사용하기

axios 인스턴스에는 요청 관련 공통 설정을 두고, TanStack Query의 `queryFn`에서 이 인스턴스를 호출하는 구조가 일반적이다.

```ts
// lib/api.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10_000,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

```ts
// queries/posts.ts
export const postQueries = {
  list: (page: number) =>
    queryOptions({
      queryKey: ['posts', 'list', { page }],
      queryFn: async () => {
        const { data } = await api.get<Post[]>('/posts', { params: { page } });
        return data;
      },
    }),
};
```

- 토큰 첨부, 토큰 재발급, 공통 헤더처럼 "요청을 어떻게 보낼지"는 axios 인터셉터에서 처리한다
- 캐싱, 재요청, 갱신처럼 "데이터를 언제 다시 가져올지"는 TanStack Query에서 처리한다

<br/>

### 에러 처리

`fetch`는 404, 500 응답에서도 Promise가 reject 되지 않기 때문에 앞의 예제에서 `res.ok`를 직접 확인했다. axios는 2xx가 아닌 응답에서 에러를 던지므로 이 확인이 필요 없고, TanStack Query도 별도 처리 없이 실패로 인식한다.

다만 TanStack Query는 기본적으로 모든 실패를 3번까지 재시도한다. 404, 403처럼 다시 요청해도 결과가 같은 에러까지 재시도하는 것은 불필요하므로, axios 에러의 상태 코드를 기준으로 재시도 여부를 정할 수 있다.

```ts
import { isAxiosError } from 'axios';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (isAxiosError(error) && error.response && error.response.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});
```

<br/>

### 선택 기준

- 인터셉터, 공통 설정, 업로드 진행률이 필요하고 이미 axios 기반 코드가 많다면: axios + TanStack Query
- 번들 크기를 줄이고 Next.js 서버 캐시를 적극적으로 활용하려면: `fetch` + TanStack Query
- 어느 쪽을 선택하든 서버 상태 관리는 TanStack Query가 담당한다

<bookmark url="https://axios-http.com/docs/intro"></bookmark>

<br/>

### 종류별 도구

| 종류 | 도구 |
| --- | --- |
| 서버 상태 | TanStack Query (Next.js에서는 서버 컴포넌트와 함께 사용) |
| URL 상태 | `useSearchParams`, 서버 컴포넌트의 `searchParams`, nuqs |
| 폼 상태 | React Hook Form + Zod |
| 지역 UI 상태 | `useState`, `useReducer` |
| 전역 클라이언트 상태 | Zustand, Jotai, 자주 변경되지 않는 값은 Context |

전역 클라이언트 상태 라이브러리의 성격은 다음과 같다.

- **Zustand**: 하나의 store에 상태와 변경 함수를 함께 정의한다. 설정이 적고 selector로 필요한 값만 구독할 수 있어 대부분의 프로젝트에 적합하다
- **Jotai**: 상태를 atom이라는 작은 단위로 나누고, atom끼리 조합해 파생 상태를 만든다. 서로 의존하는 값이 많은 화면(에디터, 복잡한 필터 등)에 적합하다
- **Redux Toolkit**: 정해진 규칙(slice, action, reducer)이 명확하고 개발 도구가 강력하다. 규모가 크고 여러 팀이 같은 상태를 다루는 프로젝트에 적합하지만, 서버 상태를 TanStack Query로 분리한 이후에는 도입할 이유가 줄어든다

<br/>

### 서버 데이터를 store에 복사하지 않기

TanStack Query를 도입한 뒤에도 자주 보이는 패턴이다.

```tsx
// 잘못된 예
const { data } = useQuery(userQueries.me());
const setUser = useUserStore((state) => state.setUser);

useEffect(() => {
  if (data) setUser(data);
}, [data, setUser]);
```

이렇게 하면 같은 데이터가 TanStack Query 캐시와 Zustand store 두 곳에 존재한다.

- 재요청으로 캐시가 갱신되어도 store 값은 `useEffect`가 실행되기 전까지 이전 값으로 남는다
- Mutation 이후 `invalidateQueries`를 호출해도 store는 별도로 갱신해야 한다
- 어느 쪽이 최신 값인지 매번 확인해야 한다

여러 곳에서 같은 데이터가 필요하다면 store에 복사하지 않고, 같은 쿼리를 사용하는 커스텀 훅을 만들어 각 컴포넌트에서 호출하면 된다. 요청은 한 번만 발생하고 모든 컴포넌트가 같은 캐시를 참조한다.

```tsx
export function useMe() {
  return useQuery(userQueries.me());
}
```

<bookmark url="https://tkdodo.eu/blog/react-query-as-a-state-manager"></bookmark>


### 조합 예시

쇼핑몰의 상품 목록 페이지를 예로 들면, 각 상태는 다음과 같이 배치된다.

| 상태 | 위치 |
| --- | --- |
| 상품 목록, 상품 상세 | TanStack Query (서버 컴포넌트에서 prefetch) |
| 카테고리, 정렬, 페이지 번호 | URL searchParams |
| 리뷰 작성 폼 | React Hook Form |
| 필터 패널 열림 여부 | `useState` |
| 비로그인 장바구니 | Zustand (요청별 store) |
| 테마 | 쿠키 + Context |
| 로그인 사용자 정보 | TanStack Query (`useMe` 훅) |

로그인 사용자 정보를 전역 store가 아닌 TanStack Query에 둔다는 점에 주목할 필요가 있다. 앱 전체에서 사용하는 값이지만 원본은 서버에 있으므로 서버 상태에 해당한다. "전역에서 사용한다"는 것과 "전역 클라이언트 상태다"는 것은 다른 기준이다.

<bookmark url="https://react.dev/learn/choosing-the-state-structure"></bookmark>

<br/>

## 참고

<bookmark url="https://tanstack.com/query/latest/docs/framework/react/overview"></bookmark>

<bookmark url="https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults"></bookmark>

<bookmark url="https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr"></bookmark>

<bookmark url="https://tkdodo.eu/blog/practical-react-query"></bookmark>

<bookmark url="https://tkdodo.eu/blog/react-query-as-a-state-manager"></bookmark>
