'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!mounted || !visible) return null;

  return createPortal(
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="맨 위로 이동"
      className="fixed bottom-20 right-6 lg:bottom-6 z-50 w-10 h-10 rounded-full bg-white dark:bg-navy-800 border border-gray-200 dark:border-navy-600 text-gray-500 dark:text-slate-400 shadow-md flex items-center justify-center hover:bg-gray-50 dark:hover:bg-navy-700 hover:text-gray-900 dark:hover:text-slate-200 transition-all duration-200"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>,
    document.body
  );
}
