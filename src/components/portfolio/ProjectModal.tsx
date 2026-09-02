'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  children: React.ReactNode;
}

const EXIT_MS = 220;

export default function ProjectModal({ children }: Props) {
  const router = useRouter();
  const [closing, setClosing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setClosing(true);
    window.setTimeout(() => router.back(), EXIT_MS);
  }, [router]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);

    // Lenis(부드러운 스크롤) 정지 → 휠 이벤트가 페이지가 아닌 모달로 감
    const lenis = (
      window as unknown as { __lenis?: { stop: () => void; start: () => void } }
    ).__lenis;
    lenis?.stop();

    // 스크롤바 폭만큼 padding으로 보정 → 배경 레이아웃이 밀리지 않음
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    const { overflow, paddingRight } = document.body.style;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    // 모달로 포커스 이동
    scrollRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      lenis?.start();
    };
  }, [close]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-100 flex items-start justify-center px-4 pt-14 sm:pt-16"
      onClick={close}
    >
      {/* backdrop-filter 없이 배경색 톤으로만 딤 → 재래스터 깜빡임 없음 */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 bg-white/60 dark:bg-navy-950/78 ${
          closing ? 'modal-backdrop-out' : 'modal-backdrop-in'
        }`}
      />

      <div
        style={{ height: 'calc(100dvh - 11rem)' }}
        className={`relative flex w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-navy-900 dark:ring-white/10 ${
          closing ? 'modal-panel-out' : 'modal-panel-in'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={close}
          aria-label="닫기"
          className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900 dark:bg-navy-700 dark:text-slate-300 dark:hover:bg-navy-600 dark:hover:text-slate-100"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <div
          ref={scrollRef}
          tabIndex={-1}
          data-lenis-prevent
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-12 outline-none sm:px-10"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
