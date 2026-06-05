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

export default function InteractiveDemo({ src, title, height = 840, caption }: Props) {
  const [loaded, setLoaded] = useState(false)

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

        <div className="relative bg-neutral-50 dark:bg-neutral-900">
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
            src={src}
            title={title}
            width="100%"
            height={height}
            className="block border-0"
            onLoad={() => setLoaded(true)}
          />
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
