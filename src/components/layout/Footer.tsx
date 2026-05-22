import { SITE } from '@/constants/site';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900">{SITE.NAME}</span>
        <span className="text-xs text-gray-400">
          © {new Date().getFullYear()}. All rights reserved.
        </span>
      </div>
    </footer>
  );
}
