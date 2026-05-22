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
    <div className="flex items-center gap-2 flex-wrap">
      {all.map((cat) => {
        const isActive = cat === active;
        return (
          <button
            key={cat}
            onClick={() => handleSelect(cat)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
              isActive
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700'
            }`}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
