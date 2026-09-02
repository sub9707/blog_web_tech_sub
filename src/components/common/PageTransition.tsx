'use client';

import { usePathname } from 'next/navigation';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // /portfolio/[slug] 은 모달(인터셉트 라우트)로 열리므로 하위 경로에서는 재마운트하지 않는다.
  const key = pathname.startsWith('/portfolio/') ? '/portfolio' : pathname;
  return (
    <main key={key} className="flex-1 page-enter">
      {children}
    </main>
  );
}
