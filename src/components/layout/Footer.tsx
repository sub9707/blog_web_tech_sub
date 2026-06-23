import { SITE } from '@/constants/site';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-100 dark:border-navy-700">
      <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900 dark:text-slate-200">{SITE.NAME}</span>
        <span className="text-xs text-gray-400 dark:text-slate-500">
          © {new Date().getFullYear()}. All rights reserved.
        </span>
      </div>
    </footer>
  );
}
