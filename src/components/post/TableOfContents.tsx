'use client';

import { useState, useEffect, useRef } from 'react';
import type { Heading } from '@/utils/extractHeadings';
import { SCROLL_OFFSET } from '@/constants/ui';

interface Props {
  headings: Heading[];
}

export default function TableOfContents({ headings }: Props) {
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
      { rootMargin: '-72px 0% -70% 0%', threshold: 0 },
    );

    headings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
    window.scrollTo({ top, behavior: 'smooth' });
    setActiveId(id);
  };

  return (
    <nav aria-label="목차">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-4">
        On this page
      </p>
      <ul className="relative border-l border-gray-100 space-y-1 pl-4">
        {headings.map(({ id, text, level }) => {
          const isActive = activeId === id;
          return (
            <li key={id} className={level === 3 ? 'pl-3' : level === 2 ? 'pl-0' : ''}>
              <a
                href={`#${id}`}
                onClick={(e) => handleClick(e, id)}
                className={`
                  relative block py-0.5 text-[13px] leading-snug transition-all duration-200
                  ${isActive
                    ? 'text-gray-900 font-medium'
                    : 'text-gray-400 hover:text-gray-700'
                  }
                `}
              >
                {isActive && (
                  <span className="absolute -left-4.25 top-1/2 -translate-y-1/2 w-px h-full bg-gray-900" />
                )}
                {text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
