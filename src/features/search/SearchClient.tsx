'use client';

import { useEffect, useRef, useState } from 'react';
import type FuseType from 'fuse.js';
import type { FuseResult, IFuseOptions } from 'fuse.js';
import type { SearchItem } from '@/types/search';
import SearchResultItem from './SearchResultItem';

const FUSE_OPTIONS: IFuseOptions<SearchItem> = {
  keys: [
    { name: 'title', weight: 0.6 },
    { name: 'tags', weight: 0.3 },
    { name: 'description', weight: 0.1 },
  ],
  includeMatches: true,
  ignoreLocation: true,
  threshold: 0.35,
  minMatchCharLength: 2,
};

function exactSearch(data: SearchItem[], query: string): FuseResult<SearchItem>[] {
  const q = query.toLowerCase();
  return data
    .filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q)),
    )
    .map((item) => ({ item, matches: [], refIndex: 0, score: 1 }));
}

export default function SearchClient() {
  const fuseRef = useRef<FuseType<SearchItem> | null>(null);
  const dataRef = useRef<SearchItem[]>([]);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FuseResult<SearchItem>[]>([]);

  useEffect(() => {
    let active = true;

    Promise.all([
      import('fuse.js'),
      fetch('/search-index.json').then((r) => r.json() as Promise<SearchItem[]>),
    ]).then(([{ default: Fuse }, data]) => {
      if (!active) return;
      dataRef.current = data;
      fuseRef.current = new Fuse(data, FUSE_OPTIONS);
      setReady(true);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready || !fuseRef.current) return;
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      const fuseResults = fuseRef.current!.search(query, { limit: 20 });
      const fuseKeys = new Set(fuseResults.map((r) => `${r.item.category}/${r.item.slug}`));

      const fallback = exactSearch(dataRef.current, query).filter(
        (r) => !fuseKeys.has(`${r.item.category}/${r.item.slug}`),
      );

      setResults([...fuseResults, ...fallback].slice(0, 20));
    }, 250);
    return () => clearTimeout(t);
  }, [query, ready]);

  const hasQuery = query.trim().length > 0;

  return (
    <>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="검색어를 입력하세요..."
          className="w-full border-b-2 border-gray-200 dark:border-navy-600 py-3 pr-10 text-gray-900 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 outline-none focus:border-gray-900 dark:focus:border-slate-300 transition-colors text-base bg-transparent"
          autoFocus
          aria-label="검색"
        />
        <svg
          className="absolute right-0 top-3.5 text-gray-400 dark:text-slate-500"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>

      {hasQuery && (
        <div className="mt-8">
          {!ready ? (
            <p className="text-sm text-gray-400 dark:text-slate-500">로딩 중...</p>
          ) : results.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-slate-500">
              &apos;{query}&apos;에 대한 검색 결과가 없습니다.
            </p>
          ) : (
            <>
              <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">{results.length}개의 결과</p>
              <ul>
                {results.map((result) => (
                  <SearchResultItem
                    key={`${result.item.category}-${result.item.slug}`}
                    result={result}
                  />
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </>
  );
}
