'use client';

import { useEffect, useState } from 'react';

const PHRASES = [
  '프론트엔드 개발자',
  'React를 좋아하는',
  '코드로 생각하는 사람',
  '끊임없이 성장 중',
  '웹을 만드는 개발자',
  '배움을 멈추지 않는',
];

const TYPE_SPEED = 70;
const DELETE_SPEED = 35;
const PAUSE_AFTER_TYPE = 1400;
const PAUSE_AFTER_DELETE = 300;

export default function HeroTyping() {
  const [displayed, setDisplayed] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const target = PHRASES[phraseIndex];

    if (!isDeleting && displayed === target) {
      const timer = setTimeout(() => setIsDeleting(true), PAUSE_AFTER_TYPE);
      return () => clearTimeout(timer);
    }

    if (isDeleting && displayed === '') {
      const timer = setTimeout(() => {
        setIsDeleting(false);
        setPhraseIndex((i) => (i + 1) % PHRASES.length);
      }, PAUSE_AFTER_DELETE);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(
      () => {
        setDisplayed(isDeleting ? target.slice(0, displayed.length - 1) : target.slice(0, displayed.length + 1));
      },
      isDeleting ? DELETE_SPEED : TYPE_SPEED,
    );

    return () => clearTimeout(timer);
  }, [displayed, isDeleting, phraseIndex]);

  return (
    <span>
      <span className="text-violet-400">const </span>
      <span className="text-blue-300">dev</span>
      <span className="text-gray-400"> = </span>
      <span className="text-emerald-300">&apos;{displayed}&apos;</span>
      <span className="inline-block w-[7px] h-3.5 bg-gray-400/70 ml-0.5 align-middle animate-pulse" />
    </span>
  );
}
