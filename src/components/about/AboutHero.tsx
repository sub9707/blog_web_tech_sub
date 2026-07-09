'use client';

import ParallaxLayer from '@/components/common/ParallaxLayer';

export default function AboutHero() {
  return (
    <section className="relative overflow-hidden min-h-[78vh] flex items-center">
      {/* Dot grid backdrop */}
      <ParallaxLayer speed={0.04} className="absolute inset-0 -z-20 opacity-40 dark:opacity-25">
        <div
          className="absolute inset-[-10%]"
          style={{
            backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            color: 'var(--border-base)',
          }}
        />
      </ParallaxLayer>

      {/* Soft gradient blobs */}
      <ParallaxLayer speed={0.18} className="absolute -z-10 top-[-15%] left-[-8%]">
        <div className="w-[26rem] h-[26rem] rounded-full bg-gray-200/60 dark:bg-navy-600/30 blur-3xl" />
      </ParallaxLayer>
      <ParallaxLayer speed={-0.12} className="absolute -z-10 top-[10%] right-[-10%]">
        <div className="w-[22rem] h-[22rem] rounded-full bg-gray-300/40 dark:bg-navy-500/20 blur-3xl" />
      </ParallaxLayer>
      <ParallaxLayer speed={0.28} className="absolute -z-10 bottom-[-20%] left-[20%]">
        <div className="w-[20rem] h-[20rem] rounded-full bg-gray-100/70 dark:bg-navy-700/30 blur-3xl" />
      </ParallaxLayer>

      {/* Giant background wordmark */}
      <ParallaxLayer speed={0.1} className="absolute inset-0 -z-10 flex items-center justify-center">
        <span
          className="text-[13rem] sm:text-[20rem] font-bold text-gray-100 dark:text-navy-800/70 select-none leading-none tracking-tight"
          style={{ fontFamily: 'var(--font-cormorant)' }}
          aria-hidden="true"
        >
          ABOUT
        </span>
      </ParallaxLayer>

      {/* Foreground content */}
      <ParallaxLayer speed={-0.06} className="relative w-full max-w-6xl mx-auto px-6">
        <span className="text-xs tracking-widest uppercase text-gray-400 dark:text-slate-500">
          About this blog
        </span>
        <h1
          className="mt-3 text-7xl sm:text-9xl font-bold text-gray-900 dark:text-slate-100 leading-none tracking-tight"
          style={{ fontFamily: 'var(--font-cormorant)' }}
        >
          About
        </h1>
        <p className="mt-6 max-w-xl text-base sm:text-lg text-gray-500 dark:text-slate-400 leading-relaxed">
          기록하고, 공유하고, 다시 배우는 개인 기술 블로그.
        </p>
      </ParallaxLayer>

      {/* Scroll cue */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-400 dark:text-slate-500">
        <span className="text-[10px] tracking-widest uppercase">Scroll</span>
        <span className="w-px h-8 bg-gray-300 dark:bg-navy-600 animate-pulse" />
      </div>
    </section>
  );
}
