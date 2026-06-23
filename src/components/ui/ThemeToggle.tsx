'use client';

import { useTheme } from 'next-themes';
import { useState, useRef, useEffect } from 'react';

type ThemeOption = 'light' | 'dark' | 'system';

const OPTIONS: { value: ThemeOption; label: string; icon: React.ReactNode }[] = [
  {
    value: 'light',
    label: 'Light',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    ),
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ),
  },
  {
    value: 'system',
    label: 'System',
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect width="20" height="14" x="2" y="3" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
  },
];

interface ThemeToggleProps {
  inline?: boolean;
}

export default function ThemeToggle({ inline = false }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!mounted) {
    return <span className="w-4 h-4" />;
  }

  if (inline) {
    return (
      <div className="flex items-center gap-1">
        {OPTIONS.map(({ value, label, icon }) => {
          const isActive = theme === value;
          return (
            <button
              key={value}
              type="button"
              aria-label={label}
              onClick={() => setTheme(value)}
              className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors ${
                isActive
                  ? 'bg-gray-100 dark:bg-navy-700 text-gray-900 dark:text-slate-100'
                  : 'text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-navy-700 hover:text-gray-700 dark:hover:text-slate-300'
              }`}
            >
              {icon}
            </button>
          );
        })}
      </div>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="테마 선택"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
      >
        {isDark ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2.5 w-32 bg-white dark:bg-navy-800 border border-gray-200 dark:border-navy-600 rounded-lg shadow-lg overflow-hidden z-50"
        >
          {OPTIONS.map(({ value, label, icon }) => {
            const isActive = theme === value;
            return (
              <button
                key={value}
                role="menuitem"
                type="button"
                onClick={() => { setTheme(value); setOpen(false); }}
                className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-left transition-colors cursor-pointer ${
                  isActive
                    ? 'text-gray-900 dark:text-slate-100 bg-gray-50 dark:bg-navy-700 font-medium'
                    : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-navy-700 hover:text-gray-900 dark:hover:text-slate-200'
                }`}
              >
                {icon}
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
