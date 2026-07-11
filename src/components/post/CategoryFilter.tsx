'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

interface Props {
  categories: string[];
}

export default function CategoryFilter({ categories }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get('category') ?? 'All';

  const handleSelect = useCallback(
    (category: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (category === 'All') {
        params.delete('category');
      } else {
        params.set('category', category);
      }
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const all = ['All', ...categories];

  return (
    <div className="flex items-center gap-6 overflow-x-auto overflow-y-hidden scrollbar-hide scroll-x-inertia border-b border-gray-200 dark:border-navy-600 mb-8">
      {all.map((cat) => {
        const isActive = cat === active;
        return (
          <button
            key={cat}
            onClick={() => handleSelect(cat)}
            className={`text-sm whitespace-nowrap pb-3 -mb-px border-b-2 transition-colors cursor-pointer shrink-0 ${
              isActive
                ? 'border-gray-900 dark:border-slate-200 text-gray-900 dark:text-slate-200 font-medium'
                : 'border-transparent text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300'
            }`}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
