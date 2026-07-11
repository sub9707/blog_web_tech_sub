'use client';

import { useEffect, useRef } from 'react';
import { useMouseParallaxStore } from '@/store/useMouseParallaxStore';

interface ParallaxLayerProps {
  speed?: number;
  mouseFactorX?: number;
  mouseFactorY?: number;
  className?: string;
  children?: React.ReactNode;
}

export default function ParallaxLayer({
  speed = 0.2,
  mouseFactorX = 0,
  mouseFactorY = 0,
  className = '',
  children,
}: ParallaxLayerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let ticking = false;
    let scrollOffset = 0;
    let mouseTargetX = 0;
    let mouseTargetY = 0;
    let mouseOffsetX = 0;
    let mouseOffsetY = 0;

    const hasMouseParallax = mouseFactorX !== 0 || mouseFactorY !== 0;
    const EASE = 0.06;

    const render = () => {
      const el = ref.current;
      if (el) {
        el.style.transform = `translate3d(${mouseOffsetX}px, ${scrollOffset + mouseOffsetY}px, 0)`;
      }
      ticking = false;
    };

    const scheduleRender = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(render);
      }
    };

    const applyScroll = () => {
      const el = ref.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        scrollOffset = (rect.top - window.innerHeight / 2) * speed;
      }
      scheduleRender();
    };

    applyScroll();
    window.addEventListener('scroll', applyScroll, { passive: true });
    window.addEventListener('resize', applyScroll);

    let unsubscribe: (() => void) | undefined;
    let inertiaFrame: number | undefined;

    if (hasMouseParallax) {
      unsubscribe = useMouseParallaxStore.subscribe((state) => {
        mouseTargetX = -state.x * mouseFactorX;
        mouseTargetY = -state.y * mouseFactorY;
      });

      const tickInertia = () => {
        mouseOffsetX += (mouseTargetX - mouseOffsetX) * EASE;
        mouseOffsetY += (mouseTargetY - mouseOffsetY) * EASE;
        render();
        inertiaFrame = requestAnimationFrame(tickInertia);
      };
      inertiaFrame = requestAnimationFrame(tickInertia);
    }

    return () => {
      window.removeEventListener('scroll', applyScroll);
      window.removeEventListener('resize', applyScroll);
      unsubscribe?.();
      if (inertiaFrame !== undefined) cancelAnimationFrame(inertiaFrame);
    };
  }, [speed, mouseFactorX, mouseFactorY]);

  return (
    <div ref={ref} className={className} style={{ willChange: 'transform' }}>
      {children}
    </div>
  );
}
