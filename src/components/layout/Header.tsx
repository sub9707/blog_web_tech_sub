import Link from 'next/link';
import { ROUTES } from '@/constants/routes';
import { SITE } from '@/constants/site';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link
          href={ROUTES.HOME}
          className="text-sm font-semibold tracking-tight text-gray-900 hover:text-gray-600 transition-colors"
        >
          {SITE.NAME}
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href={ROUTES.HOME}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Blog
          </Link>
        </nav>
      </div>
    </header>
  );
}
