'use client';

import { useState } from 'react';
import type { Heading } from '@/utils/extractHeadings';

interface Props {
  headings: Heading[];
}

export default function MobileTableOfContents({ headings }: Props) {
  const [open, setOpen] = useState(false);

  if (headings.length === 0) return null;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setOpen(false);
    setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    }, 150);
  };

  return (
    <div className="xl:hidden mb-10 border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="15" y2="12" />
            <line x1="3" y1="18" x2="10" y2="18" />
          </svg>
          목차
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul className="px-4 py-3 space-y-2 bg-white border-t border-gray-100">
          {headings.map(({ id, text, level }) => (
            <li key={id} className={level === 3 ? 'pl-3' : ''}>
              <a
                href={`#${id}`}
                onClick={(e) => handleClick(e, id)}
                className="block text-sm text-gray-600 hover:text-gray-900 py-0.5 transition-colors"
              >
                {text}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
