import Link from 'next/link';
import { ROUTES } from '@/constants/routes';
import { SITE } from '@/constants/site';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link
          href={ROUTES.HOME}
          className="text-sm font-semibold tracking-tight text-gray-900 hover:text-gray-600 transition-colors"
        >
          {SITE.NAME}
        </Link>
        <nav className="flex items-center gap-6">
          <Link href={ROUTES.HOME} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Home
          </Link>
          <Link href={ROUTES.ARCHIVE} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Archive
          </Link>
          <Link href={ROUTES.ABOUT} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            About
          </Link>
          <Link
            href={ROUTES.SEARCH}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Search
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </Link>
          <button
            type="button"
            aria-label="다크 모드 전환"
            className="text-gray-500 hover:text-gray-900 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </button>
        </nav>
      </div>
    </header>
  );
}
