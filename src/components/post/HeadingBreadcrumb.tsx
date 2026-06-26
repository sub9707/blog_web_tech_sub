'use client';

import { useState, useEffect, useRef } from 'react';
import type { Heading } from '@/utils/extractHeadings';
import { SCROLL_OFFSET } from '@/constants/ui';

interface Props {
  headings: Heading[];
}

function buildBreadcrumb(headings: Heading[], activeId: string): Heading[] {
  const idx = headings.findIndex((h) => h.id === activeId);
  if (idx === -1) return [];

  const trail: Heading[] = [];
  let currentLevel = headings[idx].level;
  trail.push(headings[idx]);

  for (let i = idx - 1; i >= 0; i--) {
    if (headings[i].level < currentLevel) {
      trail.unshift(headings[i]);
      currentLevel = headings[i].level;
      if (currentLevel === 1) break;
    }
  }

  return trail;
}

export default function HeadingBreadcrumb({ headings }: Props) {
  const [activeId, setActiveId] = useState<string>('');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (headings.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-56px 0% -70% 0%', threshold: 0 },
    );

    headings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [headings]);

  const breadcrumb = buildBreadcrumb(headings, activeId);

  if (breadcrumb.length === 0) return null;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET,
      behavior: 'smooth',
    });
  };

  return (
    <div className="sticky top-14 z-40 border-b border-gray-100 dark:border-navy-700 bg-white/95 dark:bg-navy-900/95 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-6 py-2">
        <nav
          aria-label="현재 위치"
          className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {breadcrumb.map((heading, i) => (
            <span key={heading.id} className="flex items-center gap-1 shrink-0">
              {i > 0 && (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              )}
              <a
                href={`#${heading.id}`}
                onClick={(e) => handleClick(e, heading.id)}
                className={
                  i === breadcrumb.length - 1
                    ? 'text-gray-700 dark:text-slate-300 font-medium hover:text-gray-900 dark:hover:text-slate-100 transition-colors'
                    : 'hover:text-gray-600 dark:hover:text-slate-400 transition-colors'
                }
              >
                {heading.text}
              </a>
            </span>
          ))}
        </nav>
      </div>
    </div>
  );
}
