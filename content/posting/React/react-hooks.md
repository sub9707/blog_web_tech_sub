---
title: "React Hooks 완전 정복"
date: "2025-05-01"
description: "useState, useEffect, useRef, useMemo, useCallback까지 핵심 Hook을 예제 중심으로 정리합니다."
tags: ["react", "hooks", "frontend"]
---

## useState

컴포넌트 내 상태를 선언할 때 사용합니다.

```tsx
const [count, setCount] = useState(0);
```

초기값은 렌더링 시 한 번만 평가됩니다. 비용이 큰 초기화라면 함수를 전달합니다.

```tsx
const [data, setData] = useState(() => computeExpensiveValue());
```

## useEffect

사이드 이펙트를 처리합니다. 렌더링 이후 실행됩니다.

```tsx
useEffect(() => {
  document.title = `Count: ${count}`;
}, [count]);
```

의존성 배열이 비어있으면 마운트 시 한 번만 실행됩니다.

클린업 함수를 반환하면 언마운트 또는 다음 이펙트 실행 전에 호출됩니다.

```tsx
useEffect(() => {
  const id = setInterval(() => setCount((c) => c + 1), 1000);
  return () => clearInterval(id);
}, []);
```

## useRef

렌더링 사이에 값을 유지하되 변경 시 리렌더링을 일으키지 않을 때 사용합니다.

```tsx
const inputRef = useRef<HTMLInputElement>(null);

const focus = () => {
  inputRef.current?.focus();
};
```

## useMemo / useCallback

> 성능 최적화가 필요하다고 측정된 경우에만 사용합니다.

```tsx
const sorted = useMemo(() => items.sort((a, b) => a - b), [items]);

const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

불필요한 memoization은 오히려 코드 복잡도만 높입니다.

## 정리

| Hook | 목적 |
|---|---|
| useState | 상태 관리 |
| useEffect | 사이드 이펙트 |
| useRef | DOM 참조 / 값 유지 |
| useMemo | 연산 캐싱 |
| useCallback | 함수 참조 안정화 |
