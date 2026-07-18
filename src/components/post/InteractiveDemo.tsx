'use client'

import { useState } from 'react'

interface Props {
  src: string
  title: string
  height?: number
  caption?: string
}

const ExternalLinkIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
)

const PlayIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
)

const RetryIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <polyline points="21 3 21 9 15 9" />
  </svg>
)

export default function InteractiveDemo({ src, title, height = 840, caption }: Props) {
  const [started, setStarted] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const handleRetry = () => {
    setFailed(false)
    setLoaded(false)
    setReloadKey((key) => key + 1)
  }

  return (
    <figure className="my-8 not-prose">
      <div className="block md:hidden rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <div className="px-5 py-6 bg-neutral-50 dark:bg-neutral-900 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-neutral-400" />
            <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
              Interactive Demo
            </span>
          </div>
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{title}</p>
          <p className="text-xs text-neutral-400 leading-relaxed">
            모바일에서는 새 탭에서 체험할 수 있습니다.
          </p>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium transition-opacity hover:opacity-80"
          >
            데모 체험하기
            <ExternalLinkIcon />
          </a>
        </div>
      </div>

      <div className="hidden md:block rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-neutral-300 dark:bg-neutral-600" />
              <div className="w-3 h-3 rounded-full bg-neutral-300 dark:bg-neutral-600" />
              <div className="w-3 h-3 rounded-full bg-neutral-300 dark:bg-neutral-600" />
            </div>
            <span className="text-xs font-mono text-neutral-400 ml-1">{title}</span>
          </div>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white!"
          >
            새 창에서 보기
            <ExternalLinkIcon />
          </a>
        </div>

        <div className="relative bg-neutral-50 dark:bg-neutral-900" style={{ height }}>
          {!started ? (
            <button
              type="button"
              onClick={() => setStarted(true)}
              className="group absolute inset-0 flex flex-col items-center justify-center gap-3 w-full cursor-pointer"
            >
              <span className="flex items-center justify-center w-28 h-12 rounded-md border-2 border-neutral-300/70 dark:border-neutral-600/70 bg-neutral-500/10 dark:bg-white/10 backdrop-blur-sm text-neutral-500 dark:text-neutral-300 transition-colors group-hover:bg-neutral-500/15 dark:group-hover:bg-white/15">
                <PlayIcon />
              </span>
              <span className="text-xs text-neutral-400 font-mono">Click to run</span>
            </button>
          ) : failed ? (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3"
              style={{ height }}
            >
              <span className="text-xs text-neutral-400 font-mono">
                데모를 불러오지 못했습니다.
              </span>
              <button
                type="button"
                onClick={handleRetry}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 text-xs font-medium text-neutral-600 dark:text-neutral-300 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <RetryIcon />
                다시 시도
              </button>
            </div>
          ) : (
            <>
              {!loaded && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-50 dark:bg-neutral-900 z-10"
                  style={{ height }}
                >
                  <div className="w-5 h-5 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
                  <span className="text-xs text-neutral-400 font-mono">Loading demo...</span>
                </div>
              )}
              <iframe
                key={reloadKey}
                src={src}
                title={title}
                width="100%"
                height={height}
                className="block border-0"
                onLoad={() => setLoaded(true)}
                onError={() => setFailed(true)}
              />
            </>
          )}
        </div>
      </div>

      {caption && (
        <figcaption className="mt-2 text-center text-xs text-neutral-400">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
