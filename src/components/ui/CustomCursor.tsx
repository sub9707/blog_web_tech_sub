'use client';

import { useEffect, useRef } from 'react';

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      cursorRef.current?.style.setProperty('transform', `translate(${e.clientX}px, ${e.clientY}px)`);
    };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, []);

  return (
    <div
      ref={cursorRef}
      className="pointer-events-none fixed left-0 top-0 z-[9999] will-change-transform"
      style={{ transform: 'translate(-100px, -100px)' }}
    >
      <img src="/assets/cursor.svg" alt="" width={28} height={28} draggable={false} />
    </div>
  );
}
