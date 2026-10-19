'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import type { GlossaryEntry } from '@/types/news';
import { GLOSSARY_TERM_ATTRIBUTE } from '@/constants/news';

interface Props {
  glossary: GlossaryEntry[];
  children: React.ReactNode;
}

function getSourceLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function GlossaryWrapper({ glossary, children }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeEntry = glossary.find((entry) => entry.id === activeId);

  const handleContentClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const trigger = (event.target as HTMLElement).closest(`[${GLOSSARY_TERM_ATTRIBUTE}]`);
    const id = trigger?.getAttribute(GLOSSARY_TERM_ATTRIBUTE);
    if (!id || !glossary.some((entry) => entry.id === id)) return;

    setActiveId(id);
    dialogRef.current?.showModal();
  };

  const handleDialogClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    event.stopPropagation();
    if (event.target === dialogRef.current) dialogRef.current.close();
  };

  return (
    <>
      <div onClick={handleContentClick}>{children}</div>

      <dialog
        ref={dialogRef}
        aria-labelledby="glossary-dialog-title"
        onClick={handleDialogClick}
        onClose={() => setActiveId(null)}
        className="m-auto w-[calc(100%-2rem)] max-w-lg max-h-[85vh] rounded-lg p-0 bg-white dark:bg-navy-800 text-gray-700 dark:text-slate-300 shadow-xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        {activeEntry && (
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <h2 id="glossary-dialog-title" className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                {activeEntry.term}
              </h2>
              <button
                type="button"
                aria-label="설명 닫기"
                onClick={() => dialogRef.current?.close()}
                className="shrink-0 p-1 -m-1 text-gray-400 hover:text-gray-900 dark:hover:text-slate-100 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {activeEntry.image && (
              <figure className="mt-4">
                <Image
                  src={activeEntry.image.url}
                  alt={activeEntry.image.alt}
                  width={0}
                  height={0}
                  sizes="(max-width: 640px) 100vw, 512px"
                  unoptimized
                  referrerPolicy="no-referrer"
                  className="w-full h-auto rounded-md bg-gray-50 dark:bg-navy-700"
                />
                {activeEntry.image.sourceUrl && (
                  <figcaption className="mt-1.5 text-xs text-gray-400 dark:text-slate-500">
                    이미지 출처:{' '}
                    <a href={activeEntry.image.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                      {getSourceLabel(activeEntry.image.sourceUrl)}
                    </a>
                  </figcaption>
                )}
              </figure>
            )}

            <div className="mt-4 space-y-3 text-sm leading-relaxed">
              {activeEntry.description.split(/\n{2,}/).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
