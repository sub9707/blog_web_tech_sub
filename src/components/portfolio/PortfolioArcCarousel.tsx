'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ProjectMeta } from '@/types/project';
import { ROUTES } from '@/constants/routes';

interface Props {
  projects: ProjectMeta[];
}

const CARD_TRANSITION =
  'transform 700ms cubic-bezier(0.33, 1, 0.68, 1), opacity 320ms ease';
// 카드는 항상 카메라를 향한 한쪽 면만 렌더 (반대쪽 면 이미지는 생략)
const FRONT_MIN = -30; // rel 이 이보다 크면 앞면이 카메라를 향함
const BACK_MAX = 30; // rel 이 이보다 작으면 뒷면이 카메라를 향함
const SWIPE_THRESHOLD = 56;
const STAGE_TILT = 5; // 카메라 높이: 클수록 위(탑뷰), 작을수록 눈높이에 가까움
const ELEVATION = 160; // active 카드만 위로
const ACTIVE_SCALE = 1.28;
const ACTIVE_POP = 60;
const NEIGHBOR_GAP = 120; // 선택 카드와 바로 양옆 카드 사이 추가 여백(px)
const DEG = Math.PI / 180;

const ARROW_CLASS =
  'absolute top-1/2 z-40 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-gray-900/10 bg-gray-900/85 text-white backdrop-blur-sm transition-colors hover:bg-gray-900 dark:border-white/15 dark:bg-white/90 dark:text-gray-900 dark:hover:bg-white';

function resolveRadius(width: number): number {
  if (width >= 1536) return 720;
  if (width >= 1280) return 640;
  if (width >= 1024) return 560;
  if (width >= 640) return 420;
  return 290;
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export default function PortfolioArcCarousel({ projects }: Props) {
  const total = projects.length;
  const angleStep = 360 / total;

  const [rotation, setRotation] = useState(0);
  const [radius, setRadius] = useState(560);
  const [reducedMotion, setReducedMotion] = useState(false);

  const dragStartX = useRef<number | null>(null);

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = () => setReducedMotion(motionQuery.matches);
    syncMotion();
    motionQuery.addEventListener('change', syncMotion);

    let frame = 0;
    const syncRadius = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        setRadius(resolveRadius(window.innerWidth))
      );
    };
    syncRadius();
    window.addEventListener('resize', syncRadius);

    return () => {
      motionQuery.removeEventListener('change', syncMotion);
      window.removeEventListener('resize', syncRadius);
      cancelAnimationFrame(frame);
    };
  }, []);

  const activeIndex = mod(Math.round(-rotation / angleStep), total);

  const goNext = useCallback(() => setRotation((r) => r - angleStep), [angleStep]);
  const goPrev = useCallback(() => setRotation((r) => r + angleStep), [angleStep]);
  const goToIndex = useCallback(
    (index: number) =>
      setRotation((r) => {
        const base = -index * angleStep;
        const turns = Math.round((r - base) / 360);
        return base + turns * 360;
      }),
    [angleStep]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      }
    },
    [goPrev, goNext]
  );

  const handleListClick = (event: React.MouseEvent) => {
    const target = document.getElementById('projects');
    if (!target) return;
    event.preventDefault();
    const lenis = (
      window as unknown as {
        __lenis?: {
          scrollTo: (t: HTMLElement, o?: { duration?: number }) => void;
        };
      }
    ).__lenis;
    if (lenis?.scrollTo) lenis.scrollTo(target, { duration: 1.1 });
    else target.scrollIntoView({ behavior: 'smooth' });
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    dragStartX.current = event.clientX;
  };
  const handlePointerUp = (event: React.PointerEvent) => {
    const startX = dragStartX.current;
    dragStartX.current = null;
    if (startX === null) return;
    const dx = event.clientX - startX;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (dx < 0) goNext();
    else goPrev();
  };

  if (total === 0) return null;

  const activeProject = projects[activeIndex];

  return (
    <section
      aria-roledescription="carousel"
      aria-label="포트폴리오 프로젝트"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        dragStartX.current = null;
      }}
      className="relative flex h-[calc(100svh-3.5rem)] min-h-155 w-full cursor-grab touch-pan-y flex-col overflow-hidden bg-white select-none focus-visible:outline-none active:cursor-grabbing dark:bg-navy-950"
    >
      <div className="absolute top-6 left-4 z-40 sm:top-10 sm:left-8">
        <p className="text-xs font-semibold tracking-[0.25em] text-gray-400 uppercase dark:text-slate-500">
          Portfolio
        </p>
        <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
          Selected work
        </p>
      </div>

      {/* viewport: 100vw · elevated camera. overflow는 섹션이 담당 → 카드/반사가 아래로 잘리지 않음 */}
      <div
        className="relative min-h-0 w-full flex-1"
        style={
          reducedMotion
            ? undefined
            : { perspective: '2200px', perspectiveOrigin: '50% 30%' }
        }
      >
        {/* radial world: 하나의 방사형 시스템 (불꽃놀이). 월드를 기울여 위에서 내려다봄 */}
        <div
          className="absolute inset-0 transform-3d"
          style={
            reducedMotion
              ? undefined
              : { transform: `translateY(19%) rotateX(-${STAGE_TILT}deg)` }
          }
        >
          {projects.map((project, index) => {
            // 원주상 각도 (rotation 누적 → 방사형 시스템 전체가 회전)
            const a = index * angleStep + rotation;
            const rel = a - 360 * Math.round(a / 360); // [-180, 180]
            const relRad = rel * DEG;
            const isActive = index === activeIndex;

            // ── 위치: 중심에서 radius 만큼 떨어진 원주. 정면 카드가 카메라 앞(z=0)에.
            const depth = Math.cos(relRad); // 앞 1 … 뒤 -1
            // 선택 카드에 가까운 카드일수록 좌우로 더 벌려 간격 확보
            const gapPush =
              Math.sign(rel) * NEIGHBOR_GAP * Math.max(0, depth) ** 2;
            const x = Math.sin(relRad) * radius + gapPush;
            const z = (depth - 1) * radius;

            // ── 방향: SPOKE(방사형). 궤도와 함께 연속 회전(1바퀴 360°) → 뒤집힘 없음.
            const alpha = a - 90;

            const transform = isActive
              ? `translate(-50%, -50%) translate3d(0px, ${-ELEVATION}px, ${ACTIVE_POP}px) rotateX(${STAGE_TILT}deg) scale(${ACTIVE_SCALE})`
              : `translate(-50%, -50%) translate3d(${x}px, 0px, ${z}px) rotateY(${alpha}deg)`;

            const style: React.CSSProperties = {
              transform,
              zIndex: isActive ? 50000 : Math.round(z + 3 * radius),
              transition: reducedMotion ? 'none' : CARD_TRANSITION,
            };

            const showFront = isActive || rel > FRONT_MIN;
            const showBack = !isActive && rel < BACK_MAX;
            const shade = isActive ? 0 : Math.min(0.42, (1 - depth) * 0.2);

            return (
              <Link
                key={project.slug}
                href={ROUTES.PROJECT(project.slug)}
                aria-hidden={!isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={(event) => {
                  if (!isActive) {
                    event.preventDefault();
                    goToIndex(index);
                  }
                }}
                style={style}
                className={`group absolute top-1/2 left-1/2 block aspect-square w-52 transform-3d will-change-transform sm:w-72 lg:w-84 ${
                  isActive ? 'card-glow' : ''
                }`}
              >
                {/* 카드 두께: 가장자리로 드러나는 코어 */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-0.5 rounded-lg bg-gray-300"
                />

                {/* 뒷면 (카메라를 향할 때만) */}
                {showBack && (
                  <div className="card-reflect absolute inset-0 overflow-hidden rounded-lg border-4 border-white bg-gray-900 backface-hidden transform-[translateZ(-4px)_rotateY(180deg)]">
                    {project.thumbnail ? (
                      <Image
                        src={project.thumbnail}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 288px, (max-width: 1024px) 384px, 448px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-navy-900" />
                    )}
                  </div>
                )}

                {/* 앞면 */}
                <div className="card-reflect absolute inset-0 overflow-hidden rounded-lg border-4 border-white bg-gray-900 backface-hidden transform-[translateZ(4px)]">
                  {showFront && project.thumbnail ? (
                    <Image
                      src={project.thumbnail}
                      alt={project.title}
                      fill
                      priority={isActive}
                      sizes="(max-width: 640px) 288px, (max-width: 1024px) 384px, 448px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-navy-900 px-3 text-center">
                      <span className="font-serif text-xs font-bold tracking-widest text-slate-500 uppercase">
                        {project.category}
                      </span>
                    </div>
                  )}
                  {shade > 0.02 && (
                    <div
                      className="pointer-events-none absolute inset-0 bg-navy-950"
                      style={{ opacity: shade }}
                    />
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        <button
          type="button"
          onClick={goPrev}
          aria-label="이전 프로젝트"
          style={{ left: `max(0.75rem, calc(50% - ${radius + 76}px))` }}
          className={ARROW_CLASS}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <button
          type="button"
          onClick={goNext}
          aria-label="다음 프로젝트"
          style={{ right: `max(0.75rem, calc(50% - ${radius + 76}px))` }}
          className={ARROW_CLASS}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      <div className="relative z-40 -translate-y-12 sm:-translate-y-20">
        <div className="relative px-6 pt-4 pb-10 text-center">
          <div
            className="flex flex-wrap items-center justify-center gap-2.5"
            role="tablist"
            aria-label="프로젝트 선택"
          >
            {projects.map((project, index) => (
              <button
                key={project.slug}
                type="button"
                role="tab"
                aria-selected={index === activeIndex}
                aria-label={project.title}
                onClick={() => goToIndex(index)}
                className={`h-2.5 w-2.5 rounded-full border transition-all ${
                  index === activeIndex
                    ? 'scale-125 border-gray-900 bg-gray-900 dark:border-white dark:bg-white'
                    : 'border-gray-400 hover:border-gray-600 dark:border-gray-500 dark:hover:border-gray-300'
                }`}
              />
            ))}
          </div>

          <h2
            key={`title-${activeProject.slug}`}
            className="fade-down mx-auto mt-8 max-w-2xl font-serif text-4xl font-bold text-gray-900 sm:text-5xl dark:text-slate-100"
          >
            <span className="mb-2 block text-sm font-semibold tracking-widest text-gray-400 uppercase dark:text-slate-500">
              {activeProject.category}
            </span>
            {activeProject.title}
          </h2>

          <p
            key={`desc-${activeProject.slug}`}
            className="fade-down mx-auto mt-4 max-w-2xl text-base leading-relaxed text-gray-500 sm:text-lg dark:text-slate-400"
            style={{ animationDelay: '90ms' }}
          >
            {activeProject.description}
          </p>
        </div>
      </div>

      <a
        href="#projects"
        onClick={handleListClick}
        className="absolute right-4 bottom-4 z-40 inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest text-gray-400 uppercase transition-colors hover:text-gray-900 sm:right-8 sm:bottom-6 dark:text-slate-500 dark:hover:text-slate-200"
      >
        리스트로 보기
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      </a>

      <span aria-live="polite" className="sr-only">
        {activeProject.title}, {activeIndex + 1} / {total}
      </span>
    </section>
  );
}
