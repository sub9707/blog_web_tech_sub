'use client';

import { useState, useEffect, useCallback } from 'react';

interface Props {
  children: React.ReactNode;
}

export default function ImageZoomWrapper({ children }: Props) {
  const [zoomedSrc, setZoomedSrc] = useState<string | null>(null);
  const [zoomedAlt, setZoomedAlt] = useState('');

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      const img = target as HTMLImageElement;
      setZoomedSrc(img.src);
      setZoomedAlt(img.alt || '');
    }
  }, []);

  const handleClose = useCallback(() => setZoomedSrc(null), []);

  useEffect(() => {
    if (!zoomedSrc) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [zoomedSrc, handleClose]);

  return (
    <>
      <div onClick={handleClick}>{children}</div>

      {zoomedSrc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={zoomedAlt || '이미지 확대 보기'}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-8"
          onClick={handleClose}
        >
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors"
            aria-label="닫기"
          >
            ESC / 닫기
          </button>
          <div
            className="relative max-w-[92vw] max-h-[88vh] overflow-auto rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoomedSrc}
              alt={zoomedAlt}
              className="block max-w-full h-auto rounded-lg"
            />
          </div>
        </div>
      )}
    </>
  );
}
