'use client';

import { useEffect } from 'react';
import { useMouseParallaxStore } from '@/store/useMouseParallaxStore';

export default function MouseParallaxTracker() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let ticking = false;
    let lastX = 0;
    let lastY = 0;

    const apply = () => {
      useMouseParallaxStore.getState().setPosition(lastX, lastY);
      ticking = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      lastX = (e.clientX / window.innerWidth - 0.5) * 2;
      lastY = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(apply);
      }
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, []);

  return null;
}
