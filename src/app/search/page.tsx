import type { Metadata } from 'next';
import { SITE } from '@/constants/site';
import SearchClient from '@/features/search/SearchClient';

export const metadata: Metadata = {
  title: `Search | ${SITE.NAME}`,
};

export default function SearchPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
      <div className="max-w-2xl">
        <h1 className="font-serif text-5xl font-bold text-gray-900 mb-10">Search</h1>
        <SearchClient />
      </div>
    </div>
  );
}
