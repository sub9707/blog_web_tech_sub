'use client';

import { useEffect, useRef } from 'react';

export default function ReadingProgressBar({ className = '' }: { className?: string }) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;

    const update = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min(Math.max(window.scrollY / docHeight, 0), 1) : 0;
      if (barRef.current) {
        barRef.current.style.width = `${progress * 100}%`;
      }
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div className={`w-full ${className}`}>
      <div ref={barRef} className="h-full bg-gray-900 dark:bg-slate-200" style={{ width: '0%' }} />
    </div>
  );
}
