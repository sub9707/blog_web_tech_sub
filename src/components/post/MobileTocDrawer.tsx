'use client';

import { useState, useEffect } from 'react';
import type { Heading } from '@/utils/extractHeadings';
import { SCROLL_OFFSET } from '@/constants/ui';

const DRAWER_CLOSE_DELAY = 300;

interface Props {
  headings: Heading[];
}

export default function MobileTocDrawer({ headings }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (headings.length === 0) return null;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setOpen(false);
    setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET, behavior: 'smooth' });
    }, DRAWER_CLOSE_DELAY);
  };

  return (
    <div className="xl:hidden">
      <button
        onClick={() => setOpen(true)}
        aria-label="목차 열기"
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-gray-900 dark:bg-slate-200 text-white dark:text-navy-900 shadow-lg flex items-center justify-center hover:bg-gray-700 dark:hover:bg-slate-300 transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="15" y2="12" />
          <line x1="3" y1="18" x2="10" y2="18" />
        </svg>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60"
            onClick={() => setOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-navy-800 rounded-t-2xl shadow-2xl max-h-[60vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-navy-700">
              <span className="text-sm font-semibold text-gray-900 dark:text-slate-200">목차</span>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300 transition-colors"
                aria-label="닫기"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ul className="overflow-y-auto px-5 py-4 space-y-1">
              {headings.map(({ id, text, level }) => (
                <li key={id} className={level === 3 ? 'pl-4' : ''}>
                  <a
                    href={`#${id}`}
                    onClick={(e) => handleClick(e, id)}
                    className="block py-2 text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 transition-colors border-b border-gray-50 dark:border-navy-700 last:border-0"
                  >
                    {text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
