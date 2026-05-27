'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const el = cursorRef.current;
    if (!el) return;

    el.style.display = 'block';

    const CLICKABLE = 'a, button, [role="button"], label, select, summary, input[type="submit"], input[type="button"], input[type="reset"]';

    const move = (e: MouseEvent) => {
      el.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      const isClickable = !!(e.target as HTMLElement).closest(CLICKABLE);
      el.style.opacity = isClickable ? '0' : '1';
    };

    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, []);

  return (
    <div
      ref={cursorRef}
      className="pointer-events-none fixed left-0 top-0 z-9999 will-change-transform"
      style={{ transform: 'translate(-100px, -100px)', display: 'none' }}
    >
      <Image src="/assets/cursor.svg" alt="" width={28} height={28} draggable={false} unoptimized />
    </div>
  );
}
