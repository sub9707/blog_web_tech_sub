import Link from 'next/link';
import { ROUTES } from '@/constants/routes';

export default function NotFound() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-32 text-center">
      <p className="text-sm text-gray-400 tracking-widest uppercase mb-4">
        404
      </p>
      <h1 className="text-3xl font-bold text-gray-900 mb-3">
        Page not found
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        The page you are looking for does not exist.
      </p>
      <Link
        href={ROUTES.HOME}
        className="text-sm font-medium text-gray-900 underline underline-offset-4 hover:text-gray-500 transition-colors"
      >
        Back to Blog
      </Link>
    </div>
  );
}
